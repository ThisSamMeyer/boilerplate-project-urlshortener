const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');
const bodyParser = require("body-parser");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Mount body-parser middleware
app.use(bodyParser.urlencoded({ extended: false } ));

// Connect to mongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/public', express.static(`${process.cwd()}/public`));

// Define mongoose schema for url records
const Schema = mongoose.Schema;
const urlSchema = new Schema ({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true,
    default: 0
  }
});

// Define mongoose model for url records
let Url = mongoose.model("Url", urlSchema);

// Send root path file
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Handle post requests from user
app.post('/api/shorturl', (req, res) => {

  let requestUrl = req.body.url;

  let hostname = requestUrl
    .replace(/^http[s]?:\/\//, '')
    .replace(/\/(.+)?/, '');    

  dns.lookup(hostname, (lookupErr, addresses) => {
    if (lookupErr) {
      console.log('lookup() error')
    }
    if (!addresses) {
      res.json({"error": "invalid url"})
    } else {
      Url.findOne({
        original_url: requestUrl
      }, (findOneErr, foundUrl) => {
        if (findOneErr) {
          console.log('findOne() error');
        }
        if (!foundUrl) {
          Url.estimatedDocumentCount((countErr, count) => {
            if (countErr) {
              console.log('countDocuments() error')
            }
            let addUrl = new Url({
              original_url: requestUrl,
              short_url: count + 1
            });
            addUrl.save((saveErr, urlSaved) => {
              if (saveErr) {
                console.error(saveErr);
                res.json({"error": "save error"});
              } else {
                res.json({
                  "original_url": urlSaved.original_url,
                  "short_url": urlSaved.short_url
                });
              }
            }); // addUrl.save()
          }); // Url.coundDocuments()
        } // add new url record block
        else {
          res.json({
            "original_url": foundUrl.original_url,
            "short_url": foundUrl.short_url
          });
        }
      }); // Url.findOne()
    } // url valid block
  }); // dns.lookup()
}); // app.post()

app.get('/api/shorturl/:short_url', (req, res) => {
  let inputShort = req.params.short_url;

  Url.findOne({
    short_url: inputShort
  }, (findOneErr, foundUrl) => {
    if (findOneErr) {
      console.log('findOne() error')
    } else {
      res.redirect(foundUrl.original_url)
    }
  })
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});