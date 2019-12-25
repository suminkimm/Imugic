/**
 * Required External Modules
 */
const express = require("express");
const path = require("path");

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// for deleting img files
const fs = require('fs');

// auth for google vision api
require('dotenv').config();

var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_API_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://localhost:8000'
});
spotifyApi.clientCredentialsGrant().then(
  function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  },
  function(err) {
    console.log('Something went wrong when retrieving an access token', err);
  }
);

/**
 * App Variables
*/
const app = express();
const port = process.env.PORT || "8000";

async function imageMatch(path) {
  const vision = require('@google-cloud/vision')({
    projectId: 'imugic',
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  });
  const client = new vision.ImageAnnotatorClient();

  // Performs label detection on the image file
  const [result] = await client.webDetection(path);
  const webDetection = result.webDetection;

  var key;
  var res;

  try {
    if (webDetection.webEntities.length) {
      console.log(`Web entities found: ${webDetection.webEntities.length}`);
      key = webDetection.webEntities[0].description;
      console.log('the key from imageMatch ', key);
      // res = await songMatch(key);
      // console.log('finished await ', res);
    }
  } catch(err) {
    console.error(err);
  }
  // delete image
  try {
  fs.unlinkSync(path);
  } catch(err) {
    console.error(err);
  }
  return key;
}

async function songMatch(keyword) {

  let data = await spotifyApi.searchTracks(keyword);
  console.log('I got ' + data.body.tracks.total + ' results!');

  var firstPage = data.body.tracks.items;
  var songList = [];

  firstPage.forEach(function(track, index) {
    console.log(index + ': ' + track.name + ' (' + track.popularity + ')');
    songList.push(track);
  });

  return songList;
}


/**
 *  App Configuration
 */
 app.set("views", path.join(__dirname, "views"));
 app.set("view engine", "pug");
 app.use(express.static(path.join(__dirname, "public")));

/**
 * Routes Definitions
 */
 app.get("/", (req, res) => {
   res.render("index", { title: "Home" });
 });

 app.post("/", upload.single('imageupload'), async function(req, res) {
   var picture = req.file;
   var path = picture.path;
   try {
     var img_match = imageMatch(path);
     var image = await img_match;
     console.log('imgMatch ', image);

     var song_match = songMatch(image);
     var songList = await song_match;
     // console.log('songMatch lala', match);

     res.render("results", {title: "Results", img_match: image, songList: songList});
   } catch(err) {
     console.log(err);
   }
 })

/**
 * Server Activation
 */
 app.listen(port, () => {
   console.log(`Listening to requests on http://localhost:${port}`);
 });
