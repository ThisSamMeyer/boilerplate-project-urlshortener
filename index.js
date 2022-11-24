require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Use body-parser to parse POST requests
let bodyParser = require("body-parser");
const { type } = require('os');
app.use(bodyParser.urlencoded({ extended: false } ));

// Connect to mongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Define mongoose schema and create model
const Schema = mongoose.Schema;
const urlSchema = new Schema ({
  // original_url: { type: String, required: true, lowercase: true },
  // short_url: { type: Number, required: true, unique: true }
  original_url: String,
  short_url: Number
});
let UrlShort = mongoose.model("UrlShort", urlSchema);

// Function to format URL for dns.lookup
const formatURL = url => {
  if (/^https:\/\//.test(url)) {
    return url.slice(8);
  }
  return url;
};

// Function to test if input url is valid
const isValidUrl = (url) => {

  var test = dns.resolve(url, async (err) => {
    if (err) {
      return false
    } else {
      return true
    }
  })
}

// Get data from POST requests
// Return original and short url or invalid url
app.post('/api/shorturl', (req, res) => {
  
  let originalUrl = req.body.url;
  let formattedUrl = formatURL(originalUrl);

  dns.resolve(formattedUrl, (err, records) => {
    if (err) {
      res.json({"error": "invalid url"});      // if invalid, res error
    } else {
      UrlShort
      .findOne({                              // if valid, search db for existing record
        original_url: originalUrl
      })
      .then(data => {
        if (data) {                           // if record exists, return data
          res.json({
            "original_url": data.original_url,
            "short_url": data.short_url
          });
        } else {                              // else, create new record
          UrlShort
          .countDocuments()                   // generate short url
          .then(data => {
            let newUrl = new UrlShort({
              original_url: originalUrl,
              short_url: data
            });
            newUrl.save();
            res.json({
              "original_url": newUrl.original_url,
              "short_url": newUrl.short_url
            });
          })
          .catch(err => {
            console.error(err);
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
    };
  });
});

// Redirect when user visits /api/shorturl/<short_url>
app.get('/api/shorturl/:short_url', (req, res) => {

  let short = parseInt(req.params.short_url, 10);

  UrlShort
    .findOne({
      short_url: short
    })
    .then(data => {
      res.redirect(data.original_url);
    })
    .catch(err => {
      console.error(err)
    })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});