<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Stock News AI Rating</title>

<style>
body{
font-family: Arial;
background:#f4f6f9;
padding:20px;
}

button{
padding:10px 20px;
font-size:16px;
cursor:pointer;
}

table{
width:100%;
border-collapse:collapse;
margin-top:20px;
background:white;
}

th,td{
padding:10px;
border:1px solid #ddd;
text-align:left;
}

.buy{color:green;font-weight:bold;}
.sell{color:red;font-weight:bold;}
.hold{color:orange;font-weight:bold;}
</style>
</head>

<body>

<h2>AI Stock Sentiment Analyzer</h2>

<button onclick="loadNews()">Analyze News</button>

<table id="resultTable">
<thead>
<tr>
<th>Headline</th>
<th>AI Sentiment</th>
<th>Rating</th>
</tr>
</thead>
<tbody></tbody>
</table>

<script>

const HF_API_KEY = "YOUR_HF_API_KEY";

async function loadNews(){

const res = await fetch("https://app1.whalesbook1.shop/published-news-collection/v2/free",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
date:"2026-03-06",
page:1,
limit:12,
sector:"All",
language:"English"
})
});

const json = await res.json();
const news = json.data;

for(const item of news){

let text = item.headline + ". " + item.shortDescription;

let sentiment = await analyzeSentiment(text);

let rating = convertRating(sentiment);

addRow(item.headline, sentiment, rating);

}

}

async function analyzeSentiment(text){

const res = await fetch(
"https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
{
method:"POST",
headers:{
"Authorization":"Bearer "+HF_API_KEY,
"Content-Type":"application/json"
},
body:JSON.stringify({
inputs:text
})
});

const data = await res.json();

let best = data[0].reduce((a,b)=>a.score>b.score?a:b);

return best.label;

}

function convertRating(sentiment){

if(sentiment==="POSITIVE") return "Buy";
if(sentiment==="NEGATIVE") return "Sell";
return "Hold";

}

function addRow(headline, sentiment, rating){

let tr = document.createElement("tr");

let cls="hold";

if(rating==="Buy") cls="buy";
if(rating==="Sell") cls="sell";

tr.innerHTML = `
<td>${headline}</td>
<td>${sentiment}</td>
<td class="${cls}">${rating}</td>
`;

document.querySelector("#resultTable tbody").appendChild(tr);

}

</script>

</body>
</html>