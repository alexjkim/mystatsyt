
//Initialize time constants
const days = 90;
const microsecondsPerDay = 1000 * 60 * 60 * 24;
const microsecondsPerDays = microsecondsPerDay * days;

//Initialize list and page cache
let list_cache={byvideo:{},bychannel:{}, bycategory:{}};
let page_cache = {byvideo:1, bychannel:1};
let ordered_keys = {};
let itemsPerPage = 10;
let range_pagination = 5;
let missing_channel = [];

//Initialize API KEY from a Cloud project
// Must provide API_from a Google Cloud project with YouTube Data API enabled
// https://developers.google.com/youtube/registering_an_application 
let API_KEY = "";

//Helper function to create DOM element with a given text and assigned class(es)
const createElementText = (text,classText) => {
	const elem = document.createElement("div");
	const elemText = document.createTextNode(text);
	elem.appendChild(elemText);
	elem.className=classText;
	return elem;
}

//Helper function to create DOM element for thumbnail
const createElementThumbnail = (url,imgurl) => {
	const itemThubmnail = document.createElement("div");
	const thubmnailAnchor = document.createElement("a");
	thubmnailAnchor.setAttribute("href",url);
	thubmnailAnchor.setAttribute("target","_blank");
	const thubmnailImg = document.createElement("img");
	thubmnailImg.setAttribute("src",imgurl);
	thubmnailAnchor.appendChild(thubmnailImg);
	thubmnailImg.className="thubmnailimg";
	itemThubmnail.appendChild(thubmnailAnchor);
	itemThubmnail.className="list_col thumbnail";
	return itemThubmnail;
}


//Helper function to create DOM elemeent for Stats
const createElementStats = (listName, key) => {
	const itemStats =  document.createElement("div");
	itemStats.className="list_col stats";
	
	//personal accesses
	const itemStats_pviews = document.createElement("span");
	const itemStats_pviewsText = document.createTextNode(`${list_cache[listName][key].visits.length} personal accesses`);
	itemStats_pviews.appendChild(itemStats_pviewsText);
	itemStats_pviews.className="pviews";
	itemStats.appendChild(itemStats_pviews);
	
	//Timestamps click
	const itemStats_viewts =  document.createElement("span");
	const itemStats_viewtsText = document.createTextNode(`(View timestamps)`);
	itemStats_viewts.appendChild(itemStats_viewtsText);
	itemStats_viewts.setAttribute('onclick','moreStats(this);');
	itemStats_viewts.className = "timestamp "+listName;
	itemStats_viewts.id = "ats_"+key;
	itemStats.appendChild(itemStats_viewts);
	return itemStats;
}




//Menu inspired by https://www.w3schools.com/howto/howto_js_sidenav.asp
/* Change menu and report ids to corresponding Open menu id and report with menu id */
const openMenu = () => {
  document.getElementById("closedmenu").id = "openedmenu";
  document.getElementById("report").id = "reportwmenu";
  document.getElementById("openbutton").id = "hidemenubutton";
  document.getElementById("menucontenthidden").id = "menucontent";
  
};

/* Change Open menu and report with menu ids to corresponding closed menu id and report id*/
const closeMenu = () => {
  document.getElementById("openedmenu").id = "closedmenu";
  document.getElementById("reportwmenu").id = "report";
  document.getElementById("hidemenubutton").id = "openbutton";
  document.getElementById("menucontent").id = "menucontenthidden";
};

/*Normalize milisecond timestamp data per day (fixed time)*/
const normalizeDay = (timestamp) => {
	return (timestamp-((timestamp-(1000*60*60*7)) % microsecondsPerDay));
}; 

//Initialize date range start time to capture history
let startdate = normalizeDay(Date.now()- microsecondsPerDays);

/*Generate object for chart with the last 7 days (key) and zero (values)*/
const generateObjChart = (days)=> {
	let obj ={};
	let key = startdate;
	for (let i=0; i<=days; i++){
		obj[(new Date(key)).toDateString().slice(4)]=0;
		key = key + microsecondsPerDay;
	}
	return obj;
};

//Arrange history by day (for chart rendering)
// Uses object (dictionary) data structure
// to store date (key) and counts(value)
// reads event.data.history
const chartData = (historyObj)=> {
	let chartDataObj = generateObjChart(days);
	for (id in historyObj){
		for (visit of historyObj[id].visits){
			var myDate = new Date(normalizeDay(visit));
			var key = myDate.toDateString().slice(4);
			chartDataObj[key]=chartDataObj[key]+1;
		}
	}
	return chartDataObj;
};

//Render chart - https://www.chartjs.org/docs/latest/ 
// input expected = Object (dictionary, key-value pairs)
// key = date (or X-axis)
// value = view count (or Y-axis)
const drawchart = (dataObj) => {
	const ctx = document.getElementById('myChart');
	let labels = Object.keys(dataObj);
	var myChart = new Chart(ctx, {
	    type: 'bar',
	    data: {
	        labels: labels,
	        datasets: [{
	            label: '# of accesses',
	            data: Object.values(dataObj),
	            backgroundColor: [
	                'rgba(255, 99, 132, 0.2)'
	            ],
	            borderColor: [
	                'rgba(255, 99, 132, 1)'
	            ],
	            borderWidth: 1
	        }]
	    },
	    options: {
	        scales: {
	            y: {
	                beginAtZero: true
	            }
	        },
			maintainAspectRatio: false
	    }
	});	
	
};

//Get Video details
// Must provide API_from a Google Cloud project with YouTube Data API enabled
// https://developers.google.com/youtube/registering_an_application 
// YouTube Data API Videos ref: https://developers.google.com/youtube/v3/docs/videos/list
const getVideoDetails = async (vId) => {
	try{
		const resp = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${vId}&key=${API_KEY}&part=snippet,contentDetails,statistics`);
		return resp.data;
	}
	catch(e){
		console.log(e);
	}
}

//Get Video category name
// Must provide API_from a Google Cloud project with YouTube Data API enabled
// https://developers.google.com/youtube/registering_an_application 
// YouTube Data API VideosCategories ref: https://developers.google.com/youtube/v3/docs/videoCategories/list
const getVideoCategoryDetails = async (catId) => {
	try{
		const resp = await axios.get(`https://www.googleapis.com/youtube/v3/videoCategories?id=${catId}&key=${API_KEY}&part=snippet`);
		return resp.data;
	}
	catch(e){
		console.log(e);
	}
}

//Cleaning up table
const removeChilds = (domElement)=>{
	while (domElement.firstElementChild!=domElement.lastElementChild){
		domElement.removeChild(domElement.lastElementChild);
	}
}

//Expanding for more stats
const moreStats = (elem) => {
	let stats = document.getElementById(elem.id);
	stats.innerText= "(Hide timestamps)";
	stats.setAttribute("onclick",'lessStats(this)');

	//initializing variables for timestamp HTML element and text
	let timestamp; 
	let timestampText;
	list_cache[elem.className.split(" ")[1]][elem.id.slice(4)].visits.sort((a,b)=>b - a);
	
	for(ts of list_cache[elem.className.split(" ")[1]][elem.id.slice(4)].visits){
		timestamp =  document.createElement("div");
		timestampText = document.createTextNode(new Date(ts).toLocaleDateString("en-US") + " - " + new Date(ts).toLocaleTimeString("en-US"));
		timestamp.appendChild(timestampText);
		timestamp.className = "list_timestamp ";
		stats.appendChild(timestamp);
	}
}

//Closing more stats
const lessStats = (elem) => {
	let stats = document.getElementById(elem.id);
	stats.innerText= "(View timestamps)";
	stats.setAttribute("onclick",'moreStats(this)');
}

//Update list_cache (by video) and bycategory with more information from a list of keys checked on YouTube API 
const updateYTInfo = async (keysArray) => {
	//Identify keys to fetch for details on YouTube API (that have not been populated yet in cache)
	const needVideoDetails = keysArray.filter(key => !list_cache["byvideo"][key].hasOwnProperty("videoName"));
	
	//Partition needVideoDetails when length > 50 (API does not work well if there's more than 50 ids)
	while(needVideoDetails.length>0){
		//Retrieve up to 50 videos details from the YouTube API
		let videoDetails = await getVideoDetails(needVideoDetails.splice(0,50).join(","));
		
		//temporary variable to get category Ids from each video (without repetition)
		let categoriesList = new Set();
	
		//Populate video list cache with each video missing details
		for (item of videoDetails.items){
			list_cache["byvideo"][item.id].videoName = item.snippet.title;
			list_cache["byvideo"][item.id].channelId = item.snippet.channelId;
			list_cache["byvideo"][item.id].channelName = item.snippet.channelTitle;
			list_cache["byvideo"][item.id].thumbnailImg = item.snippet.thumbnails.default.url;
			list_cache["byvideo"][item.id].kind = item.kind;
			list_cache["byvideo"][item.id].videoDuration = item.contentDetails.duration;
			list_cache["byvideo"][item.id].categoryId = item.snippet.categoryId;
			categoriesList.add(item.snippet.categoryId);
			list_cache["byvideo"][item.id].statsLike = item.statistics.likeCount;
			list_cache["byvideo"][item.id].statsAllView = item.statistics.viewCount;
			console.log("Videos Loaded");
		}
		
		const needCatDetails = Array.from(categoriesList).filter(key => !list_cache["bycategory"].hasOwnProperty(key));
		//Partition needVideoDetails when length > 50 (API does not work well if there's more than 50 ids)
		while(needCatDetails.length>0){
			let categoryDetails = await getVideoCategoryDetails(needCatDetails.splice(0,50).join(","));
			for (item of categoryDetails.items){
				list_cache["bycategory"][item.id] = {categoryName: item.snippet.title};
				console.log("Categories Loaded");
			}
		}
	}
}

//Aggregate accesses from list_cache per channel
const aggregateListperChannel = () => {
	let allKeys = Object.keys(list_cache["byvideo"]); 
	for (key of allKeys) {
		if (list_cache["byvideo"][key].hasOwnProperty("channelName")) {
			if (list_cache["bychannel"].hasOwnProperty(list_cache["byvideo"][key].channelId)){
				list_cache["bychannel"][list_cache["byvideo"][key].channelId].visits.concat(list_cache["byvideo"][key].visits);
			}
			else{
				list_cache["bychannel"][list_cache["byvideo"][key].channelId]={
					channelName: list_cache["byvideo"][key].channelName,
					visits: list_cache["byvideo"][key].visits
				}
			} 
		}
		else{
			missing_channel.push(key);
		}
	}
}

//Create header helper function organizing header depending on listName
const createHeader = (elem, listName) => {
	let rankHeader =  createElementText("Rank","list_col rank");
	let channelHeader =  createElementText("Channel","list_col channel");
	let statsHeader =  createElementText("Statistics","list_col stats");
	
	switch(listName) {
	  case "bychannel":
  		elem.append(rankHeader, channelHeader, statsHeader);	
  		elem.className="list_row header bychannel";
	    break;
	  case "byvideo":
  		let thumbnailHeader =  createElementText("Thumbnail","list_col thumbnail");
  		let videonameHeader =  createElementText("Video Name","list_col videoname");
  		elem.append(rankHeader, thumbnailHeader, videonameHeader, channelHeader, statsHeader);	
  		elem.className="list_row header byvideo";
		break;
	}
}

//Create build report results helper function organizing results columns depending on listName
// this function should "mirror" the header function columns
const createResultElem = (p, elem, listName, keys) => {
  	//initialize parameters (rank)
  	let rank = ((p-1)*itemsPerPage)+1;
	let listItem;
	let itemRank;
	let itemChannel;
	let itemStats;
	
	switch(listName) {
	  case "bychannel":
	  	for (key of keys) {
	  		//Creating new Row - Aggregates item info
	  		listItem = document.createElement("div");
	  		listItem.className="list_row video";
				
	  		//Rank column
	  		itemRank = createElementText(rank,"list_col rank");
	  		rank++;
		
	  		//Channel Name (equivalent to singer name when music) column
	  		itemChannel =  createElementText(list_cache[listName][key].channelName,"list_col channel");
		
	  		//Statistics column
	  		itemStats =  createElementStats(listName, key);
		
	  		//Aggregate columns into row 
	  		listItem.append(itemRank, itemChannel, itemStats);
		
	  		//Including the row into the table
	  		elem.appendChild(listItem);
	  	}
	    break;
	  case "byvideo":
	  	for (key of keys) {
	  		//Creating new Row - Aggregates item info
	  		listItem = document.createElement("div");
	  		listItem.className="list_row video";
				
	  		//Rank column
	  		itemRank = createElementText(rank,"list_col rank");
	  		rank++;
		
	  		//Thubmnail column
	  		let itemThubmnail = createElementThumbnail("https://www.youtube.com/watch?v="+key,list_cache[listName][key].thumbnailImg);
		
	  		//Video Name Column
	  		let itemVideo =  createElementText(list_cache[listName][key].videoName,"list_col videoname");
		
	  		//Channel Name (equivalent to singer name when music) column
	  		itemChannel =  createElementText(list_cache[listName][key].channelName,"list_col channel");
		
	  		//Statistics column
	  		itemStats =  createElementStats(listName, key);
		
	  		//Aggregate columns into row 
	  		listItem.append(itemRank, itemThubmnail, itemVideo, itemChannel, itemStats);
		
	  		//Including the row into the table
	  		elem.appendChild(listItem);
	  	}
  		
		break;
	}
	
}

//Update expand cache with information from YouTube helper 
// Updaging only necessary information depending on listName
const updateNecessaryInfo = async (page, listName) => {
	let keysPerPage;
	switch(listName) {
	  case "bychannel":
	  	//Update list_cache.byvideo and list_cache.bycategory for all list_cache.byvideo keys without details
	  	await updateYTInfo(Object.keys(list_cache["byvideo"]));
	
	  	//Aggregate accesses per channel
	  	aggregateListperChannel();

	  	//Generate list of ordered channels by views, if it was not generated yet
	  	if (!ordered_keys.hasOwnProperty(listName)){
	  		ordered_keys[listName] = Object.keys(list_cache[listName]).sort((a,b)=>list_cache[listName][b].visits.length - list_cache[listName][a].visits.length);
	  	}
	
	  	//Array of elements for the page (up to videosPerPage)
	  	keysPerPage = ordered_keys[listName].slice((page-1)*itemsPerPage,(page*itemsPerPage));
	    break;
	  case "byvideo":
	  	//Generate list of ordered keys by access (visits) if it does not exist yet
	  	if (!ordered_keys.hasOwnProperty(listName)){
	  		ordered_keys[listName] = Object.keys(list_cache[listName]).sort((a,b)=>list_cache[listName][b].visits.length - list_cache[listName][a].visits.length);
	  	}
	
	  	//Array of elements for the page (up to videosPerPage)
	  	keysPerPage = ordered_keys[listName].slice((page-1)*itemsPerPage,(page*itemsPerPage));
	
	  	//Update list_cache.byvideo and list_cache.bycategory for the videos in the rendered page
	  	await updateYTInfo(keysPerPage);
		
		break;
	}
	return keysPerPage;
}

//Render List - can iterate event.data.history and collect vId, visitCount
// joing data from YouTube API for additional information 
// https://developers.google.com/youtube/v3/docs/videos/list
// layout on CSS inspired by https://codepen.io/lukepeters/pen/bfFur
const renderList = async (page, listName) => {
	
	//Save page in cache
	page_cache[listName]=page;
	
	//identify HTML element where the list of videos will be included
	let table = document.getElementById("report_table");
	
	//Clean up table, except the first Child (Header)
	removeChilds(table); 
	
	//Capture header to updated it, if necessary
	let headers = document.getElementById("list_headers"); 
	if (!headers.classList.contains(listName)){
		//Remove header
		removeChilds(headers);
		if (headers.firstElementChild){
			headers.removeChild(headers.firstElementChild);
		}
		//Recreate header
		createHeader(headers, listName);
	}
	
	//Adding loader before calculations and async calls (populating data)
	document.getElementById("loader").style.display = "table-cell";
	
	//Array of elements for the page (up to videosPerPage) after updating necessary information
	let keysPerPage = await updateNecessaryInfo(page, listName);
	
	//Removing loader before calculations and async calls (populating data)- rest of rendering should be fast
	document.getElementById("loader").style.display = "none";
		
	createResultElem(page, table, listName, keysPerPage);
	
	renderPagination(listName, "renderList");
};

//Render pagination list
const renderPagination = (listName, renderFuncName) => {
	//identifying HTML element where the list of pages will be in
	let tablepages = document.getElementById("pagination");
	const listPages = document.createElement("div");
	listPages.className="list_row pages";
	
	//Make sure to clean up possible existing pagination
	while (tablepages.firstElementChild){
		tablepages.removeChild(tablepages.firstElementChild);
	}
	
	//Determine what's the last possible page, and range to show page numbers	
	let last_page = Math.floor(ordered_keys[listName].length / itemsPerPage);
	let upper_index = ((page_cache[listName] + range_pagination) > last_page) ? last_page : page_cache[listName] + range_pagination;
	let bottom_index = ((page_cache[listName] - range_pagination) < 1) ? 1 : page_cache[listName] - range_pagination;
	
	//initializing variables for index HTML element and text
	let pageIndex; 
	let pageIndexText;
	
	//Adding index for first page
	if (bottom_index > 1) {
		pageIndex =  document.createElement("span");
		pageIndexText = document.createTextNode("<<");
		pageIndex.appendChild(pageIndexText);
		pageIndex.setAttribute('onclick',renderFuncName+'(1,"'+listName+'");');
		pageIndex.className = "page_index border_pagination";
		listPages.appendChild(pageIndex);
	}

	//Adding index range
	for(let i = bottom_index; i <= upper_index; i++){
		pageIndex =  document.createElement("span");
		pageIndexText = document.createTextNode(i);
		pageIndex.appendChild(pageIndexText);
		pageIndex.setAttribute('onclick',renderFuncName+'(' + i + ',"'+listName+'");');
		pageIndex.className = (i == page_cache[listName]) ? "page_index page_selected" : "page_index";
		listPages.appendChild(pageIndex);
	} 
	
	//Ading index for last page
	if (upper_index < last_page) {
		pageIndex =  document.createElement("span");
		pageIndexText = document.createTextNode(">>");
		pageIndex.appendChild(pageIndexText);
		pageIndex.setAttribute('onclick',renderFuncName+'(' + last_page + ',"'+listName+'");');
		pageIndex.className = "page_index border_pagination";
		listPages.appendChild(pageIndex);
	}
	tablepages.appendChild(listPages);
} 

//Capture API KEY
const retrieveAPIKey = () => {
	API_KEY=prompt("Please, provide your API Key to proceed:","https://developers.google.com/youtube/registering_an_application");
}

//capture video history information from chrome extension
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source != window)
    return;
  
  if (event.data.type && (event.data.type == "Ext_ready")) {
	  document.getElementById("no_data").innerHTML = "MyStatsYT extension was found. Checking for the Extension to provide the Chrome history data.";
	  window.postMessage({ type: "requestforhistory", starttimestamp: startdate }, '*');
  }
  
  if (event.data.type && (event.data.type == "YTExt_Data")) {
	//event.data.history is an array of objects
	// date range >> set as "startdate"
	// date range = last 7 days + Today (default)
	// vId = ?v parameter from youtube.com url (video Id)
	// visits = array of timestamp (each visit)   
    
	//Save Chrome history info by video in cache
	list_cache["byvideo"] = event.data.history;
	
	if(API_KEY==""){
		retrieveAPIKey();
	}
  
	//render chart
	drawchart(chartData(event.data.history));

	//render list
	(async () => {
		await renderList(page_cache.byvideo, "byvideo");
	}
	)();
	

  }
}, false);






