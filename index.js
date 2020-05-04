const express = require("express");
const packageJson = require("./package.json");
const fetch = require("node-fetch");
const http = require("http");
const language = require("@google-cloud/language");
const btoa = require("btoa");
const { Question } = require("./models");
var bodyParser = require("body-parser");
var Sequelize = require("sequelize"),
  sequelize = null;

const app = express();

const GOT_IT_URL = "https://api.gotit.ai/NLU/v1.4/Analyze";
const API_KEY =
  "Basic " + btoa("1562-gliaxITp:oMMx6HvvYih89mhdAvsDtubSdY6ujMZHj1TNsneyVEQW");

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ version: packageJson.version });
});

app.post("/question", (req, res) => {
  const { question } = req.body;

  const formattedQuestion = JSON.stringify({
    T: question,
    SL: "PtBr",
    S: true,
  });

  console.log(formattedQuestion);

  fetch(GOT_IT_URL, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: formattedQuestion,
  })
    .then((res) => res.json())
    .then((result) => {
      console.log(result);
      res.json({
        score: result.sentiment.score,
        label: result.sentiment.label,
        question: question,
      });
    })
    .catch((e) => {
      console.log(e);
    });
});

// checks if env is Heroku, if so, sets sequelize to utilize the database hosted on heroku
if (process.env.DATABASE_URL) {
  // the application is executed on Heroku ... use the postgres database
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "mysql",
    protocol: "mysql",
  });
}

app.post("/questionv2", async (req, res) => {
  // Creates a client
  const client = new language.LanguageServiceClient();

  const { question } = req.body;

  const document = {
    content: question,
    type: "PLAIN_TEXT",
  };

  const [result] = await client.analyzeSentiment({ document });

  const sentiment = result.documentSentiment;

  let label = "";
  if (sentiment.score > 0) {
    label = "POSITIVE";
  } else if (sentiment.score < 0) {
    label = "NEGATIVE";
  } else if (sentiment.score === 0) {
    label = "NEUTRAL";
  }

  return res.json({
    score: sentiment.score,
    label: label,
    question: question,
  });
});

app.post("/quest", (req, res) => {
  const { question, answer, confidence } = req.body;

  Question.create({
    question: question,
    answer: answer,
    confidence: confidence,
  });
  res.json({
    data: {
      question,
      answer,
      confidence,
    },
  });
});

app.get("/quest", async (req, res) => {
  const data = await Question.findAll();
  res.json(JSON.stringify(data));
});

app.listen(process.env.PORT || 3333);
