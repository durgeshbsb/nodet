import fetch from "node-fetch";
import * as cheerio from "cheerio";

// export const getResult = async (req, res) => {
//     try {

//         const { text } = req.body;

//         const response = await fetch("https://api.openai.com/v1/chat/completions", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
//             },
//             body: JSON.stringify({
//                 model: "gpt-4o-mini",
//                 messages: [
//                     {
//                         role: "user",
//                         content: "Answer only BUY, DON'T BUY, or MAYBE with a short reason:\n\n" + text
//                     }
//                 ],
//                 max_tokens: 60
//             })
//         });

//         const data = await response.json();

//         res.json({
//             success: true,
//             result: data
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

// export const getResult = async (req, res) => {
//     try {

//         const { text } = req.body;

//         const response = await fetch("http://localhost:11434/api/generate", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "tinyllama",
//                 prompt: `
// You are a stock market analyst.

// Based on the news below, decide if the stock should be BUY, SELL, or HOLD.

// Respond STRICTLY in this format:

// VERDICT: BUY | SELL | HOLD
// REASON: one short sentence

// News:
// ${text}`,
//                 stream: false
//             })
//         });

//         const data = await response.json();

//         res.json({
//             success: true,
//             result: data.response
//         });

//     } catch (error) {

//         res.status(500).json({
//             success: false,
//             message: error.message
//         });

//     }
// };

// export const getResult = async (req, res) => {
//     try {
//         const { text } = req.body;

//         // Prompt for multiple-stock news
//         const messages = [
//             {
//                 role: "user",
//                 content: `
// You are a stock market analyst.

// The news below may mention multiple publicly listed companies.
// Task:
// 1. Identify all mentioned companies.
// 2. For each company, decide BUY, SELL, or HOLD.
// 3. Give a one-sentence reason.

// Respond ONLY in strict JSON like this:

// {
//   "Company Name 1": "BUY - reason",
//   "Company Name 2": "SELL - reason"
// }

// News:
// ${text}
// `
//             }
//         ];

//         const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${process.env.HF_API_KEY}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "deepseek-ai/DeepSeek-R1:novita", // replace with any HF chat model
//                 messages: messages,
//                 stream: false
//             })
//         });

//         const data = await response.json();

//         // Hugging Face may return the response here:
//         const output = data?.choices?.[0]?.message?.content || data?.error || "";

//         let resultJson = {};
//         try {
//             resultJson = JSON.parse(output.replace(/\n/g, ""));
//         } catch (e) {
//             resultJson = { raw: output };
//         }

//         res.json({
//             success: true,
//             result: resultJson
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

export const getResult = async (req, res) => {
    try {
        const { text } = req.body;

        const messages = [
            {
                role: "user",
                content: `
You are a stock market analyst.

The news below may mention multiple publicly listed companies.
Task:
1. Identify all mentioned companies.
2. For each company, decide BUY, SELL, or HOLD.
3. Give a one-sentence reason.

Respond ONLY in strict JSON like this:
{
  "Company Name 1": "BUY - reason",
  "Company Name 2": "SELL - reason"
}

News:
${text}
      `
            }
        ];

        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-R1:novita",
                messages,
                stream: false
            })
        });

        const data = await response.json();

        let output = data?.choices?.[0]?.message?.content || "";

        // Strip Markdown code blocks like ```json ... ```
        output = output.replace(/```json/g, "").replace(/```/g, "").trim();

        let resultJson = {};
        try {
            resultJson = JSON.parse(output);
        } catch (e) {
            resultJson = { raw: output };
        }

        res.json({
            success: true,
            result: resultJson
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const analyzeNewsBatch = async (req, res) => {
    try {
        const { page = 1, limit = 5, date } = req.body;

        // 1️⃣ Fetch news list
        const listRes = await fetch("https://app1.whalesbook1.shop/published-news-collection/v2/free", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Origin": "https://www.whalesbook.com",
                "Referer": "https://www.whalesbook.com"
            },
            body: JSON.stringify({ date, page, limit, sector: "All", language: "English" })
        });

        const listData = await listRes.json();
        const newsItems = listData?.data || [];

        if (!newsItems.length) {
            return res.json({ success: true, result: { Error: "HOLD - No news found for the given date/page." } });
        }

        // 2️⃣ Fetch detailed news content for each news item
        const newsContents = await Promise.all(newsItems.map(async (item) => {
            const url = `https://www.whalesbook.com/news/English/${item.newsType.toLowerCase().replace(/\s+/g, "-")}/${slugify(item.headline)}/${item._id}`;
            try {
                const htmlRes = await fetch(url, {
                    headers: { "accept": "*/*", "referer": "https://www.whalesbook.com/all-news/English/All" }
                });
                const html = await htmlRes.text();

                const $ = cheerio.load(html);
                const content = $(".main-content-area").text().trim();

                return { title: item.headline, content };
            } catch (err) {
                return { title: item.headline, content: "" };
            }
        }));

        function slugify(str) {
            return str
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        }

        // Filter out empty content
        const validNews = newsContents.filter(n => n.content.length > 0);
        if (!validNews.length) {
            return res.json({ success: true, result: { Error: "HOLD - No news content available for analysis." } });
        }

        // 3️⃣ Prepare Hugging Face prompt
        const prompt = `
You are a stock market analyst.

For the following news articles, identify all mentioned companies.
For each company, decide BUY, SELL, or HOLD and give a one-sentence reason.
Respond ONLY in JSON format:
{
  "Company Name": "BUY/HOLD/SELL - reason"
}

News:
${validNews.map(n => `Title: ${n.title}\n${n.content}`).join("\n\n")}
`;

        // 4️⃣ Call Hugging Face API
        const hfRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // model: "deepseek-ai/DeepSeek-R1:novita",
                model: "ProsusAI/finbert",
                messages: [{ role: "user", content: prompt }],
                stream: false
            })
        });

        const hfData = await hfRes.json();
        let output = hfData?.choices?.[0]?.message?.content || "";

        // Clean code block if present
        output = output.replace(/```json/g, "").replace(/```/g, "").trim();

        let resultJson = {};
        try { resultJson = JSON.parse(output); }
        catch { resultJson = { raw: output }; }

        res.json({ success: true, result: resultJson });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


/*

javascript: (async () => { const el = document.querySelector('.main-content-area'); if (!el) { alert("Content not found"); return; } const text = el.innerText.slice(0, 3000); const apiKey = "sk-1234uvwx5678abcd1234uvwx5678abcd1234uvwx"; const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Analyze this product info and answer ONLY: BUY, DON'T BUY, or MAYBE with a one sentence reason:\n\n" + text }], max_tokens: 50 }) }); const data = await res.json(); alert(data.choices[0].message.content); })();


javascript:(async()=>{const el=document.querySelector('.main-content-area');if(!el){alert("Content not found");return;}const text=el.innerText.slice(0,3000);const res=await fetch("http://localhost:3000/api/stocks/get",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});const data=await res.json();alert(data.result||"No result");})();


javascript:(async()=>{const el=document.querySelector('.main-content-area');if(!el){alert("Content not found");return;}const text=el.innerText.slice(0,3000);const res=await fetch("http://localhost:3000/api/stocks/get",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});const data=await res.json();alert(data.result||"No result");})();

javascript:(async()=>{   const el=document.querySelector('.main-content-area');   if(!el){alert("Content not found");return;}   const text=el.innerText.slice(0,3000);   const res=await fetch("http://localhost:3000/api/stocks/get",{      method:"POST",     headers:{"Content-Type":"application/json"},     body:JSON.stringify({text})   });   const data=await res.json();   if(!data.success){alert("Error: "+data.message);return;}      let message="";   const stocks = data.result;   for(const [company, verdict] of Object.entries(stocks)){     message+=`${company}: ${verdict}\n`;   }   alert(message); })();

*/