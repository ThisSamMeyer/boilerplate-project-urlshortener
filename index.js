require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Use body-parser to parse POST requests
let bodyParser = require("body-parser");
const { doesNotMatch } = require('assert');
const { type } = require('os');
const { url } = require('inspector');
app.use(bodyParser.urlencoded({ extended: false } ));

// Connect to mongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Set options for dns.lookup
const options = {
  family: 6,
  hints: dns.ADDRCONFIG | dns.V4MAPPED
};

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// #2 - Create a Model
const Schema = mongoose.Schema;
const urlSchema = new Schema ({
  url: { type: String, required: true, unique: true, lowercase: true },
  shortUrl: Number
});

let URL = mongoose.model("URL", urlSchema);

// Function to format URL for dns.lookup
const formatURL = url => {
  if (/^https:\/\//.test(url)) {
    return url.slice(8);
  }
  return url;
};

// Get data from POST requests
app.post('/api/shorturl', (req, res) => {
  let { url: originalUrl } = req.body;
  let formattedURL = formatURL(originalUrl);

  // validate url, send error if invalid
  dns.lookup(formattedURL, options, (err, address, family) => {
    if (err) {
      res.json({ "error": "invalid url" });
      return;
    };
    // Search database and create new record if no matches are found
    URL
      .findOne({
        url: originalUrl
      })
      .then(data => {
        if (data) {
          res.json({
            "original_url": data.url,
            "short_url": data.shortUrl
          });
        } else {
          URL
            .countDocuments()
            .then(data => {
              data++;
              let newURL = new URL({ url: originalUrl, shortUrl: data });
              newURL.save()
                .then(data => {
                  res.json({ 
                    "original_url": data.url,
                    "short_url": data.shortUrl
                  });
                })
                .catch(err => {
                  console.error(err)
                });
            });
        }
      })
      .catch(err => {
        console.error(err)
      });
  });
});

// Redirect when user visits /api/shorturl/<short_url>
app.get('/api/shorturl/:short_url', (req, res) => {
  URL
    .findOne({
      shortUrl: req.params.short_url
    })
    .then(data => {
      res.redirect(data.url);
    })
    .catch(err => {
      console.error(err)
    })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
