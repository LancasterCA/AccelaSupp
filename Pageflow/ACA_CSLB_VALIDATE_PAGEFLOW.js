/*------------------------------------------------------------------------------------------------------/
| Program : ACA_CSLB_VALIDATE_PAGEFLOW.js
| Event   : ACA_CSLB_VALIDATE_PAGEFLOW
|
| Usage   : Script to check LP license against CSLB in pageflow
|
| Client  : N/A
| Action# : N/A
|
| Notes   :
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/
var showMessage 	= true; 	// Set to true to see results in popup window
var showDebug 		= true; 	// Set to true to see debug messages in popup window
var cancel 			= false;

var sysFromEmail	= "noreply@accela.com";
var debugEmail		= "orlando@slsgov.com";
var debugCCEmail	= "chad@slsgov.com";
var emlText			= "";

/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var startDate	= new Date();
var startTime	= startDate.getTime();
var message		= ""; // Message String
var debug		= ""; // Debug String
var br			= "<BR>"; // Break Tag

var SCRIPT_VERSION = 3.0;
var useCustomScriptFile = true;  // if true, use Events->Custom Script, else use Events->Scripts->INCLUDES_CUSTOM
var useSA = false;
var SA = null;
var SAScript = null;
var bzr = aa.bizDomain.getBizDomainByValue("MULTI_SERVICE_SETTINGS", "SUPER_AGENCY_FOR_EMSE");
if (bzr.getSuccess() && bzr.getOutput().getAuditStatus() != "I") {
    useSA = true;
    SA = bzr.getOutput().getDescription();
    bzr = aa.bizDomain.getBizDomainByValue("MULTI_SERVICE_SETTINGS", "SUPER_AGENCY_INCLUDE_SCRIPT");
    if (bzr.getSuccess()) {
        SAScript = bzr.getOutput().getDescription();
    }
}

if (SA) {
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS", SA,useCustomScriptFile));
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS_ASB", SA,useCustomScriptFile));
    eval(getScriptText("INCLUDES_ACCELA_GLOBALS", SA,useCustomScriptFile));
    eval(getScriptText(SAScript, SA));
} else {
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS",null,useCustomScriptFile));
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS_ASB",null,useCustomScriptFile));
    eval(getScriptText("INCLUDES_ACCELA_GLOBALS",null,useCustomScriptFile));
}

eval(getScriptText("INCLUDES_CUSTOM",null,useCustomScriptFile));

function getScriptText(vScriptName, servProvCode, useProductScripts) {
    if (!servProvCode)  servProvCode = aa.getServiceProviderCode();
    vScriptName = vScriptName.toUpperCase();
    var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
    try {
        if (useProductScripts) {
            var emseScript = emseBiz.getMasterScript(aa.getServiceProviderCode(), vScriptName);
        } else {
            var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(), vScriptName, "ADMIN");
        }
        return emseScript.getScriptText() + "";
    } catch (err) {
        return "";
    }
}


function EMAIL_printObjProperties(obj) {
	try {
		var idx;


		emlText += "<br>" + "**************** PRINTING "+obj+" ************************";
		emlText += "<br>" + "the type is:"+typeof obj;
		
		if(obj.getClass != null){
			emlText += "<br>" + "************* " + obj.getClass() + " *************";
		}
		else {
			emlText += "<br>" + "this is not an object with a class!";
		}


		for(idx in obj){
			try {
				if( obj[idx] != null) {
					if ((obj[idx]) && (typeof (obj[idx]) == "function")) {
						try {
							emlText += "<br>" + "FUNCTION: "+ idx + "==>  " + obj[idx]();
						} catch (ex) { }
					} 
					else if (obj[idx]) {
						emlText += "<br>" + "ATTRIBUTE: "+ idx + ":  " + obj[idx];
					}
					else emlText += "<br>" + "cannot print object and idx ref is null:"+idx;
				}
				else emlText += "<br>" + "the idx of this object is null!";
			}
			catch (err) {
				emlText += "<br>" + "ERROR Printing Object Properties for element ["+idx+"]:  >>"+err;
			}
		}
	}
	catch (err) {
		emlText += "<br>" + "ERROR IN EMAIL OBJECTS:  >>"+err;
	}
}
// set up Global Variables for ACA Pageflow Script

var cap = aa.env.getValue("CapModel");
var capId = cap.getCapID();
var servProvCode = capId.getServiceProviderCode(); // Service Provider Code
var publicUser = false;
var currentUserID = aa.env.getValue("CurrentUserID");
var publicUserID = aa.env.getValue("CurrentUserID");
if (currentUserID.indexOf("PUBLICUSER") == 0) {
    currentUserID = "ADMIN";
    publicUser = true;
} // ignore public users 

var capIDString = capId.getCustomID(); // alternate cap id string
var systemUserObj = aa.person.getUser(currentUserID).getOutput(); // Current User Object
var appTypeResult = cap.getCapType();
var appTypeString = appTypeResult.toString(); // Convert application type to string ("Building/A/B/C")
var appTypeArray = appTypeString.split("/"); // Array of application type string
var currentUserGroup;
var currentUserGroupObj = aa.userright.getUserRight(appTypeArray[0], currentUserID).getOutput();
if (currentUserGroupObj) currentUserGroup = currentUserGroupObj.getGroupName();
var capName = cap.getSpecialText();
var capStatus = cap.getCapStatus();
var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(), sysDate.getDayOfMonth(), sysDate.getYear(), "");
var parcelArea = 0;
var estValue = 0;
var calcValue = 0;
var feeFactor; // Init Valuations
var valobj = aa.finance.getContractorSuppliedValuation(capId, null).getOutput(); // Calculated valuation
if (valobj.length) {
    estValue = valobj[0].getEstimatedValue();
    calcValue = valobj[0].getCalculatedValue();
    feeFactor = valobj[0].getbValuatn().getFeeFactorFlag();
}

var balanceDue = 0;
var houseCount = 0;
feesInvoicedTotal = 0; // Init detail Data
var capDetail = "";
var capDetailObjResult = aa.cap.getCapDetail(capId); // Detail
if (capDetailObjResult.getSuccess()) {
    capDetail = capDetailObjResult.getOutput();
    var houseCount = capDetail.getHouseCount();
    var feesInvoicedTotal = capDetail.getTotalFee();
    var balanceDue = capDetail.getBalance();
}

var AInfo = new Array(); // Create array for tokenized variables
loadAppSpecific4ACA(AInfo); // Add AppSpecific Info
//loadTaskSpecific(AInfo);                        // Add task specific info
//loadParcelAttributes(AInfo);                        // Add parcel attributes
//loadASITables();
loadASITables4ACA();

logDebug("<br>" + "<B>ACA PAGEFLOW SCRIPT: ACA_CSLB_VALIDATE_PAGEFLOW</B>");
logDebug("<br>" + "<B>EMSE Script Results for " + capIDString + "</B>");
logDebug("<br>" + "capId = " + capId.getClass());
logDebug("<br>" + "cap = " + cap.getClass());
logDebug("<br>" + "currentUserID = " + currentUserID);
logDebug("<br>" + "currentUserGroup = " + currentUserGroup);
logDebug("<br>" + "systemUserObj = " + systemUserObj.getClass());
logDebug("<br>" + "appTypeString = " + appTypeString);
logDebug("<br>" + "capName = " + capName);
logDebug("<br>" + "capStatus = " + capStatus);
logDebug("<br>" + "sysDate = " + sysDate.getClass());
logDebug("<br>" + "sysDateMMDDYYYY = " + sysDateMMDDYYYY);
logDebug("<br>" + "parcelArea = " + parcelArea);
logDebug("<br>" + "estValue = " + estValue);
logDebug("<br>" + "calcValue = " + calcValue);
logDebug("<br>" + "feeFactor = " + feeFactor);
logDebug("<br>" + "houseCount = " + houseCount);
logDebug("<br>" + "feesInvoicedTotal = " + feesInvoicedTotal);
logDebug("<br>" + "balanceDue = " + balanceDue);

//*************page flow custom code begin*************//
try{
	
	logDebug("<br>------Start of Pageflow Custom Code------");

	var lpOnRecordOK = externalLP_CA_AT_Pageflow(null,"Contractor",cap);

	logDebug("<br>"+"Just called the externalLP_CA_AT_Pageflow and the return is:"+lpOnRecordOK);

	if ( lpOnRecordOK ) {
		// something got returned so we need to cancel the pageflow
		cancel = true;
		showMessage = true;
		comment("One or more Licensed Professionals on this record have an<br>invalid license status with the California State Licensing Board");
		comment(lpOnRecordOK);
	}

	logDebug("<br>------End of Pageflow Custom Code------");
}
catch(err){
    cancel = true;
    showDebug = 3;
    logDebug("Error on custom pageflow ACA_CSLB_VALIDATE_PAGEFLOW. Err: " + err);
	showMessage = true;
    comment("Error on custom pageflow ACA_CSLB_VALIDATE_PAGEFLOW. Err: " + err);
}

aa.sendMail(sysFromEmail, debugEmail, debugCCEmail, "ACA CSLB VALIDATION PAGEFLOW", "emlText =<br>"+emlText+"<br>debug =<br>"+debug);

//*************page flow custom code end*************//

if (debug.indexOf("**ERROR") > 0) {
    aa.env.setValue("ErrorCode", "1");
    aa.env.setValue("ErrorMessage", debug);
} else {
    if (cancel) {
        aa.env.setValue("ErrorCode", "-2");
        if (showMessage)
            aa.env.setValue("ErrorMessage", message);
        if (showDebug)
            aa.env.setValue("ErrorMessage", debug);
    } else {
        aa.env.setValue("ErrorCode", "0");
        if (showMessage)
            aa.env.setValue("ErrorMessage", message);
        if (showDebug)
            aa.env.setValue("ErrorMessage", debug);
    }
}


function externalLP_CA_AT_Pageflow(licNum,rlpType,itemCap) {
	logDebug("starting externalLP_CA_AT_Pageflow with:");
	logDebug("licNum:"+licNum);
	logDebug("rlpType:"+rlpType);
	logDebug("itemCap:"+itemCap);
	/*
	Version: 10

	Usage:

		licNum	:  Valid CA license number.   Non-alpha, max 8 characters.  If null, function will use the LPs on the supplied CAP ID
		rlpType	:  License professional type to use when validating and creating new LPs
		itemCap	:  should be type CapModel.  If supplied, licenses on the CAP will be validated.  Also will be refreshed if doPopulateRef and doPopulateTrx are true

	returns: non-null string of status codes for invalid licenses

	most of the time in pageflow script you will use this to check all LPs added, so you do not need
	to pass the licNum and should set it to null, but DO pass the capModel (itemCap)

	*/
	var returnMessage = "";

	var workArray = new Array();
	if (licNum)
		workArray.push(String(licNum));

	if (itemCap)
	{
		/* below is how to get LPs for ACA */
        var lpList = itemCap.getLicenseProfessionalList();
        if(lpList != null && lpList.size() > 0)
        {
            for(var i=lpList.size(); i > 0; i--)
            {
                var lpModel = lpList.get(i-1);
				workArray.push(lpModel);
            }
        }
	}

	for (var thisLic = 0; thisLic < workArray.length; thisLic++) {
		var licNum = workArray[thisLic];
		var licObj = null;
		var isObject = false;
		
		// is this one an object or string?
		if (typeof(licNum) == "object") {
			licObj = licNum;
			licNum = licObj.getLicenseNbr();
			isObject = true;
		}

		// Make the call to the California State License Board

		var document;
		var root;        
		var aURLArgList = "https://www2.cslb.ca.gov/IVR/License+Detail.aspx?LicNum=" + licNum;
		var vOutObj = aa.httpClient.get(aURLArgList);
		var isError = false;
		if (vOutObj.getSuccess()) {
			var vOut = vOutObj.getOutput();
			var sr =  aa.proxyInvoker.newInstance("java.io.StringBufferInputStream", new Array(vOut)).getOutput();
			var saxBuilder = aa.proxyInvoker.newInstance("org.jdom.input.SAXBuilder").getOutput();
			document = saxBuilder.build(sr);
			root = document.getRootElement();
			errorNode = root.getChild("Error");
		}
		else{
			isError = true;
		}
		if (isError) {
			logDebug("The CSLB web service is currently unavailable");
			continue;
		}
		else if (errorNode) {
			logDebug("Error for license " + licNum + " : " + errorNode.getText().replace(/\+/g," "));
			returnMessage+="License " + licNum +  " : " + errorNode.getText().replace(/\+/g," ") + " ";
			continue;
		}

		var lpStatus = root.getChild("PrimaryStatus");
		var stas     = lpStatus.getChildren();
		var stasSize = stas.size();

		if ( stasSize > 0 ) {
			var sta = stas.get(0);  // we will always only evaluate the first status code

			// Primary Status
			// 3 = expired, 10 = good, 11 = inactive, 1 = canceled.   We will ignore all but 10 and return text.
			if (sta.getAttribute("Code").getValue() != "10") {
				returnMessage+="License:" + licNum + ", " + sta.getAttribute("Desc").getValue() + " ";
			}
			else {
				logDebug("the license number searched is good! equals 10!!!!");
			}
		}
	} // for each license

	if (returnMessage.length > 0) return returnMessage;
	else return null;
} // end function
