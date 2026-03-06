const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const HF_API_KEY = "YOUR_HF_API_KEY";

app.post("/analyze", async (req, res) => {

    const text = req.body.text;

    try {

        const response = await fetch(
            "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + HF_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ inputs: text })
            });

        const data = await response.json();

        let best = data[0].reduce((a, b) => a.score > b.score ? a : b);

        res.json(best);

    }
    catch (err) {
        res.status(500).json({ error: err.toString() });
    }

});

app.get("/", (req, res) => {
    res.send("Server running");
});

app.listen(3000, () => console.log("Server running on port 3000"));