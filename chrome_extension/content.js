//console.log('just YT!');
//window.onload=()=>console.log(window.location.href);


//Casting chrome history information with type FROM_YTExt (to be capture by
// MyStatsYT script.js) 
window.addEventListener("message", (event) => { 
    if (event.source != window)
      return;
	if (event.data.type && (event.data.type == "requestforhistory")) {
		chrome.runtime.sendMessage({handshake: "whatismyhistory", starttime: event.data.starttimestamp}, function(response) {
  			 window.postMessage({ type: "YTExt_Data", history: response.data}, "*");
		});
	}
}, false);


window.postMessage({ type: "Ext_ready", status:"ready"}, "*");
