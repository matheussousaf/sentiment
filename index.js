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
const API_ML_OTTO = "http://localhost:5000/predict";

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ version: packageJson.version });
});

// checks if env is Heroku, if so, sets sequelize to utilize the database hosted on heroku
if (process.env.DATABASE_URL) {
  // the application is executed on Heroku ... use the postgres database
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "mysql",
    protocol: "mysql",
  });
}

async function fetchInGotit(question) {
  const formattedQuestion = JSON.stringify({
    T: question,
    SL: "PtBr",
    S: true,
  });

  return await fetch(GOT_IT_URL, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: formattedQuestion,
  })
    .then((res) => res.json())
    .then((result) => {
      return new Promise((resolve, reject) => {
        const response = { score: result.sentiment.score };

        if (result.sentiment.label === "POSITIVE")
          resolve({ ...response, label: 2 });
        if (result.sentiment.label === "NEUTRAL") {
          resolve({ ...response, label: 1 });
        }
        if (result.sentiment.label === "NEGATIVE")
          resolve({ ...response, label: 0 });
      });
    });
}

app.post("/quest", (req, res) => {
  const { question } = req.body;

  const formattedQuestion = {
    msg: question,
    confidence: 1,
    flag_offense: 1,
  };

  fetch(API_ML_OTTO, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formattedQuestion),
  })
    .then((res) => res.json())
    .then(async (result) => {
      const gotItResult = await fetchInGotit(question);

      if (result.answer === 2) {
        // Pergunta BOA
        if (gotItResult.label === 2 || gotItResult.label === 1) {
          Question.create({
            question: question,
            answer:
              "Obrigado pela pergunta! Te retornaremos o quanto antes possível",
            confidence: gotItResult.score,
          });
          res.json({
            data: {
              question: question,
              answer:
                "Obrigado pela pergunta! Te retornaremos o quanto antes possível",
              confidence: gotItResult.score,
            },
          });
        } else {
          res.json({
            question: question,
            answer: "Pergunta imprópria, redirecionando.",
            confidence: 1,
          });
        }
      } else if (result.answer === 1) {
        // Pergunta NEUTRA

        if (gotItResult.label === 2 || gotItResult.label === 1) {
          Question.create({
            question: question,
            answer:
              "Obrigado pela pergunta! Te retornaremos o quanto antes possível",
            confidence: gotItResult.score,
          });
          res.json({
            data: {
              question: question,
              answer:
                "Obrigado pela pergunta! Te retornaremos o quanto antes possível",
              confidence: gotItResult.score,
            },
          });
        } else {
          res.json({
            question: question,
            answer: "Pergunta imprópria, redirecionando.",
            confidence: 1,
          });
        }
      } else if (result.answer === 0) {
        // Pergunta RUIM
        res.json({
          question: question,
          answer: "Pergunta imprópria, redirecionando.",
          confidence: 1,
        });
      }
    });
});

app.get("/quest", async (req, res) => {
  const data = await Question.findAll();
  res.json(data);
});

app.listen(process.env.PORT || 3333);
