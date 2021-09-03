
//Initialize time constants
const days = 7;
const microsecondsPerDay = 1000 * 60 * 60 * 24;
const microsecondsPerDays = microsecondsPerDay * days;

//Initialize list and page cache
let list_cache;
let category_cache = {};
let page_cache;
let ordered_keys;
let itemsPerPage = 10;
let range_pagination = 5;

//Initialize API KEY from a Cloud project
// Must provide API_from a Google Cloud project with YouTube Data API enabled
// https://developers.google.com/youtube/registering_an_application 
let API_KEY = [ADD API KEY HERE];



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
	            label: '# of views',
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
const removeDataRows = (domElement)=>{
	while (domElement.firstElementChild!=domElement.lastElementChild){
		domElement.removeChild(domElement.lastElementChild);
	}
}

//Expanding for more stats
const moreStats = (id) => {
	let stats = document.getElementById(id);
	stats.innerText= "(Hide timestamps)";
	stats.setAttribute("onclick",'lessStats(this.id)');

	//initializing variables for timestamp HTML element and text
	let timestamp; 
	let timestampText;
	list_cache[id.slice(3)].visits.sort((a,b)=>b - a);
	for(ts of list_cache[id.slice(3)].visits){
		timestamp =  document.createElement("div");
		timestampText = document.createTextNode(new Date(ts).toLocaleDateString("en-US") + " - " + new Date(ts).toLocaleTimeString("en-US"));
		timestamp.appendChild(timestampText);
		timestamp.className = "list_timestamp";
		stats.appendChild(timestamp);
	}
}

//Closing more stats
const lessStats = (id) => {
	let stats = document.getElementById(id);
	stats.innerText= "(View timestamps)";
	stats.setAttribute("onclick",'moreStats(this.id)');
}

//Render List - can iterate event.data.history and collect vId, visitCount
// joing data from YouTube API for additional information 
// https://developers.google.com/youtube/v3/docs/videos/list
// layout on CSS inspired by https://codepen.io/lukepeters/pen/bfFur
//    snippet.title
//   snippet.thumbnails.default.url
//   channelTitle
//   contentDetails.duration
// statistics.viewCount
// statistics.likeCount
const renderList = async (page) => {
	//initialize parameters (rank)
	let rank = ((page-1)*itemsPerPage)+1;
	
	//Save page in cache
	page_cache=page;
	
	//identify HTML element where the list of videos will be included
	let table = document.getElementById("report_table");
	//htmlelement.removeChild(htmlelement.childNodes[0]);
	
	//Clean up table, except the first Child (Header)
	removeDataRows(table); 
	
	//Generate list of ordered video IDs by views
	ordered_keys = Object.keys(list_cache).sort((a,b)=>list_cache[b].visits.length - list_cache[a].visits.length);
		
	
	//Array of elements for the page (up to videosPerPage)
	let keysPerPage = ordered_keys.slice((page-1)*itemsPerPage,(page*itemsPerPage));
	
	//Identify keys to fetch for details on YouTube API (that have not been populated yet in cache)
	const needVideoDetails = keysPerPage.filter(key => !list_cache[key].hasOwnProperty("videoName"));
	let videoDetails = await getVideoDetails(needVideoDetails.join(","));
	
	//temporary variable to get category Ids from each video (without repetition)
	let categoriesList = new Set();
	
	//Populate video list cache with each video missing details
	for (item of videoDetails.items){
		list_cache[item.id].videoName = item.snippet.title;
		list_cache[item.id].channelName = item.snippet.channelTitle;
		list_cache[item.id].thumbnailImg = item.snippet.thumbnails.default.url;
		list_cache[item.id].kind = item.kind;
		list_cache[item.id].videoDuration = item.contentDetails.duration;
		list_cache[item.id].categoryId = item.snippet.categoryId;
		categoriesList.add(item.snippet.categoryId);
		list_cache[item.id].statsLike = item.statistics.likeCount;
		list_cache[item.id].statsAllView = item.statistics.viewCount;
		console.log("Videos Loaded");
	}
	
	//Populate categories cache with each category missing details
	const needCatDetails = Array.from(categoriesList).filter(key => !category_cache.hasOwnProperty(key));
	let categoryDetails = await getVideoCategoryDetails(needCatDetails.join(","));
	for (item of categoryDetails.items){
		category_cache[item.id] = {categoryName: item.snippet.title};
		console.log("Categories Loaded");
	}
	
	//Adding new rows (one per item of the array)
	for (key of keysPerPage) {

		//Creating new Row - Aggregates item info
		const listItem = document.createElement("div");
		listItem.className="list_row video";
		
		
		//Building Columns: Rank, Thumbnail, Video Name, Channel, Statistics
		
		//Rank column
		const itemRank = document.createElement("div");
		const itemRankText = document.createTextNode(rank);
		itemRank.appendChild(itemRankText);
		itemRank.className="list_col rank";
		rank++;
		
		//Thubmnail column
		const itemThubmnail = document.createElement("div");
		const thubmnailAnchor = document.createElement("a");
		thubmnailAnchor.setAttribute("href","https://www.youtube.com/watch?v="+key);
		thubmnailAnchor.setAttribute("target","_blank");
		const thubmnailImg = document.createElement("img");
		//need update - thumbnail link
		thubmnailImg.setAttribute("src",list_cache[key].thumbnailImg);
		thubmnailAnchor.appendChild(thubmnailImg);
		thubmnailImg.className="thubmnailimg";
		itemThubmnail.appendChild(thubmnailAnchor);
		itemThubmnail.className="list_col thumbnail";
		
		//Video Name Column
		const itemVideo =  document.createElement("div");
		//need update - what is video title
		const itemVideoText = document.createTextNode(`${list_cache[key].videoName}`);
		itemVideo.appendChild(itemVideoText);
		itemVideo.className="list_col videoname";
		
		//Channel Name (equivalent to singer name when music)
		const itemChannel =  document.createElement("div");
		//need update - channel name
		const itemChannelText = document.createTextNode(`${list_cache[key].channelName}`);
		itemChannel.appendChild(itemChannelText);
		itemChannel.className="list_col channel";
		
		//Statistics column
		// - viewCount (personal)
		// - duration
		// - viewCount (All people)
		// - likeCount
		const itemStats =  document.createElement("div");
		itemStats.className="list_col stats";
		
		//personal views
		const itemStats_pviews = document.createElement("span");
		const itemStats_pviewsText = document.createTextNode(`${list_cache[key].visits.length} personal views`);
		itemStats_pviews.appendChild(itemStats_pviewsText);
		itemStats_pviews.className="pviews";
		itemStats.appendChild(itemStats_pviews);
		
		//Timestamps click
		const itemStats_viewts =  document.createElement("span");
		const itemStats_viewtsText = document.createTextNode(`(View timestamps)`);
		itemStats_viewts.appendChild(itemStats_viewtsText);
		itemStats_viewts.setAttribute('onclick','moreStats(this.id);');
		itemStats_viewts.className="timestamp";
		itemStats_viewts.id=`ts_${key}`;
		itemStats.appendChild(itemStats_viewts);
		
		
		//Aggregate columns into row 
		listItem.append(itemRank, itemThubmnail, itemVideo, itemChannel, itemStats);
		//Including the row into the table
		table.appendChild(listItem);

	}
	
	renderPagination();
};



//Render pagination list
const renderPagination = () => {
	//identifying HTML element where the list of pages will be in
	let table = document.getElementById("pagination");
	const listPages = document.createElement("div");
	listPages.className="list_row pages";
	
	//Make sure to clean up possible existing pagination
	while (table.firstElementChild){
		table.removeChild(table.firstElementChild);
	}
	
	//Determine what's the last possible page, and range to show page numbers	
	let last_page = Math.floor(ordered_keys.length / itemsPerPage) + 1;
	let upper_index = ((page_cache + range_pagination) > last_page) ? last_page : page_cache + range_pagination;
	let bottom_index = ((page_cache - range_pagination) < 1) ? 1 : page_cache - range_pagination;
	
	//initializing variables for index HTML element and text
	let pageIndex; 
	let pageIndexText;
	
	//Adding index for first page
	if (bottom_index > 1) {
		pageIndex =  document.createElement("span");
		pageIndexText = document.createTextNode("<<");
		pageIndex.appendChild(pageIndexText);
		pageIndex.setAttribute('onclick','renderList(1);');
		pageIndex.className = "page_index border_pagination";
		listPages.appendChild(pageIndex);
	}

	//Adding index range
	for(let i = bottom_index; i < upper_index; i++){
		pageIndex =  document.createElement("span");
		pageIndexText = document.createTextNode(i);
		pageIndex.appendChild(pageIndexText);
		pageIndex.setAttribute('onclick','renderList(' + i + ');');
		pageIndex.className = (i == page_cache) ? "page_index page_selected" : "page_index";
		listPages.appendChild(pageIndex);
	} 
	
	//Ading index for last page
	if (upper_index < last_page) {
		pageIndex =  document.createElement("span");
		pageIndexText = document.createTextNode(">>");
		pageIndex.appendChild(pageIndexText);
		pageIndex.setAttribute('onclick','renderList(' + last_page + ');');
		pageIndex.className = "page_index border_pagination";
		listPages.appendChild(pageIndex);
	}
	table.appendChild(listPages);
} 

//capture video history information from chrome extension
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source != window)
    return;
  
  if (event.data.type && (event.data.type == "Ext_ready")) {
	  window.postMessage({ type: "requestforhistory", starttimestamp: startdate }, '*');
  }

  if (event.data.type && (event.data.type == "YTExt_Data")) {
	//event.data.history is an array of objects
	// date range >> set as "startdate"
	// date range = last 7 days + Today (default)
	// vId = ?v parameter from youtube.com url (video Id)
	// visits = array of timestamp (each visit)   
    
	//Save Chrome history info in cache
	list_cache = event.data.history;
  
	//render chart
	drawchart(chartData(event.data.history));

	//render list
	(async () => {
		await renderList(1);
	}
	)();
	
	

  }
}, false);






