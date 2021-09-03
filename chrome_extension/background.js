//Alternative method to capture history (chrome.tabs)
//commenting out in favor of the method based on chrome.history
// var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?youtube\.com/;
//
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
// 	if (urlRegex.test(tab.url)) {
// 		console.log(tab.url);
//
// 		chrome.storage.sync.set({key: tab.url}, function() {
// 		});
//
// 		chrome.storage.sync.get(['key'], function(result) {
// 			console.log('Value currently is ' + result.key);
// 		});
//
// 	}
//
// });



//Function to get parameter from url string
const getURLParam = (param, url)=>{
	let regex = new RegExp('[\?&]' + param + '(=([^&#]*)|&|#|$)');
	let results = regex.exec(url);
	if (!results || !results[2]){
		return '';
	}
	return results[2]
}
//console.log(getURLParam("x","https://music.youtube.com/watch?v=zxNAUKIOuYs&list=LM"));

//Capture list of videos using chrome.history
// https://developer.chrome.com/docs/extensions/reference/history/

// //Initialize date range start time to capture history >> getting from script.js
// const days = 7;
// const microsecondsPerDays = 1000 * 60 * 60 * 24 * days;
// let startdate = (new Date).getTime() - microsecondsPerDays;

//Capture navigation history that contains youtube string 
// and from initialized date range 
// Cleaned up information to specific parameters (and parameter value) 


//Getting array of time stemps for chrome.history.getVisits
const getVisits = (visitsItems, startDate, id, tempObj, countURL, sendResponse)=>{
	for (visit of visitsItems){
		if (visit.visitTime > startDate){
			if (tempObj.hasOwnProperty(id)){
				tempObj[id].visits.push(visit.visitTime);
			}
			else{
				tempObj[id]={visits:[visit.visitTime]};
			}
		}
	}
	if (countURL==0){
		sendResponse({data: tempObj});
	}
	
	
};

//Binding obj in chrome.history.getVisits callback function 
const bindArrayGetVisit = (time, id, obj, count, func)=>{
	return function(visitsItems){
		getVisits (visitsItems, time, id, obj, count, func);
	};
};

//Getting array of visited site objects from Chrome history 
const getChromeHistory = (historyItems, startDate, sendResponse) => {
	//storing array of simplified objects (removing unecessary data)
	let tempObj = {};
	let countURL = historyItems.length;
	for (historyItem of historyItems){
		countURL--;
		let id = getURLParam("v",historyItem.url);
		if (id != ""){
			chrome.history.getVisits({url:historyItem.url},
				bindArrayGetVisit(startDate, id, tempObj, countURL, sendResponse));
		} 
	}
};

//Binding obj in chrome.history.search callback function 
const bindArrayGetHistory = (time, func)=>{
	return function(historyItems){
		getChromeHistory (historyItems, time, func);
	};
};

//Capturing Chrome history information containing "youtube" text
const getHistory = (startdate, sendResponse) => {
	chrome.history.search({
		'text':'youtube',
		'maxResults': 1000,
		'startTime': startdate 
		},
		bindArrayGetHistory(startdate, sendResponse)
	);
};

//Send information to content.js
chrome.runtime.onMessage.addListener(
	(request, sender, sendResponse)=>{
    	if (request.handshake === "whatismyhistory") {
			//Make history information available to content.js
			// filter data without video Id out
			getHistory(request.starttime, sendResponse);			
			return true;
		} 				
	});	
	
	
	
	