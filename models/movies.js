const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovieSchema = new Schema({
  plot: String,
  genres: [String],
  runtime: Number,
  cast: [String],
  poster: String,
  title: String,
  fullplot: String,
  languages: [String],
  released: Date,
  directors: [String],
  rated: String,
  awards: {
    type: Object,
    default: {}
  },
  lastupdated: { type: Date, default: Date.now },
  year: Number,
  imdb: {
    type: Object,
    default: {}
  },
  countries: [String],
  type: String,
  tomatoes: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('Movie', MovieSchema);