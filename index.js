var express = require('express');
var mongoose = require('mongoose');
var app = express();
const jwt = require('jsonwebtoken');
const handlebars = require('handlebars');
const crypto = require('crypto');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
var path = require('path');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ 'extended': 'true' }));           
app.use(bodyParser.json());                                    
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

const jwtSecretKey = crypto.randomBytes(32).toString('hex') || '1234';
const exphbs = require('express-handlebars');
require('dotenv').config();
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');

app.engine('.hbs', exphbs.engine({
  extname: '.hbs',
  handlebars: allowInsecurePrototypeAccess(handlebars)
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

exphbs.create().handlebars.registerHelper('jo', function (array, separator) {
  return array.join(separator);
});

// to generate API key
const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const Api_Key = generateApiKey();
console.log('Generated API Key:', Api_Key);

const connectionString = process.env.MONGODB_URI
const db = {
  initialize: async (connectionString) => {
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
  }
};
const PORT = 8000;
// Initialize the MongoDB connection
db.initialize(connectionString)
  .then(() => {
    app.listen(PORT, () => {

      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Import the movie model
var Movie = require('./models/movies');
const handleErrors = (res, status, message) => {
  res.status(status).json({ error: message });
};

// Initialize session and cookie parser middleware
app.use(cookieParser());
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));

const authenticateUser = async (username, password) => {
  
  const user = { username: 'vamshi', password: '$2b$10$zMJ5FKljvNkh2nrZ0odVGuiPHNiDazwv3rqrhoBa17n9AypFulDKS' };

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (isPasswordValid) {
    const token = jwt.sign({ username: user.username }, jwtSecretKey, { expiresIn: '1h' });
    
    return { token };
  }

  return null;
};


const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt;
  console.log(req.cookies);

  if (!token) {
   
    return res.status(401).json({ error: 'Unauthorized - Plese Login' });
  }

  jwt.verify(token, jwtSecretKey, (err, decoded) => {
    if (err) {
      res.redirect("/");
      return res.status(401).json({ error: 'Unauthorized - Plese Login' });
     
    }

    req.user = decoded;
    next();
  });
};




// Login route
app.get('/', (req, res) => {
  // Render the login form
  res.render('login');
});

app.post('/', async (req, res) => {
  const { username, password } = req.body;

  // Authenticate the user
  const authenticatedUser = await authenticateUser(username, password);

  if (authenticatedUser) {
    req.session.user = username;

    res.cookie('jwt', authenticatedUser.token, { httpOnly: true });

    res.render('index');
  } else {
    res.render('login');
    res.status(401).send('Authentication failed');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();

  res.clearCookie('jwt');

  res.redirect('/');
});

// all movies
app.get('/api/allmovies', verifyToken, (req, res) => {
  Movie.find().limit(500).then((movies) => {
    res.render('AllMovies', {
      moviesData: movies
    });
  })
  .catch(error => {
    handleErrors(res, 500, 'Internal Server Error');
  });
  
});
app.get('/api/allmoviesimdb', verifyToken, (req, res) => {
  Movie.find({ 'imdb.rating': { $ne: null, $ne: '' } }).limit(500).sort({ 'imdb.rating': -1 }).then((movies) => {
    console.log(movies);
    res.render('AllMovies', {
      moviesData: movies
    });
  })
  .catch(error => {
    handleErrors(res, 500, 'Internal Server Error');
  });
});
app.get('/api/allmoviesyear', verifyToken, (req, res) => {
  Movie.find({ 'year': { $ne: null, $ne: '' } }).limit(500).sort({ 'year': -1 }).then((movies) => {
    console.log(movies);
    res.render('AllMovies', {
      moviesData: movies
    });
  })
  .catch(error => {
    handleErrors(res, 500, 'Internal Server Error');
  });
  
});




// insert movie using handlebars
app.get('/api/movies/insert', verifyToken, (req, res) => {
  console.log('Reached /api/sales/new route');
  res.render('insert');
});
app.post('/api/movies/insert', verifyToken, async (req, res) => {
  try {
    const {
      plot,
      genres,
      runtime,
      cast,
      poster,
      fullplot,
      languages,
      released,
      directors,
      rated,
      awards,
      lastupdated,
      year,
      imdb,
      countries,
      type,
      tomatoes
    } = req.body;

    console.log(req.body);

    const newMovie = new Movie({
      plot: plot,
      genres: genres ? genres.split(',').map(genre => genre.trim()) : [],
      runtime: parseInt(runtime) || 0,
      cast: cast ? cast.split(',').map(actor => actor.trim()) : [],
      poster: poster,
      fullplot: fullplot,
      languages: languages ? languages.split(',').map(language => language.trim()) : [],
      released: released ? new Date(released) : undefined,
      directors: directors ? directors.split(',').map(director => director.trim()) : [],
      rated: rated,
      awards: awards ? JSON.parse(awards) : {},
      lastupdated: lastupdated ? new Date(lastupdated) : undefined,
      year: parseInt(year) || 0,
      imdb: imdb ? JSON.parse(imdb) : {},
      countries: countries ? countries.split(',').map(country => country.trim()) : [],
      type: type,
      tomatoes: tomatoes ? JSON.parse(tomatoes) : {}
    });

    await newMovie.save();

    res.redirect('/api/allmovies');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding a new invoice');
  }
});



// add movie using thunder client
app.post('/api/Movies', (req, res) => {
  Movie.create(req.body)
    .then(newMovie => {
      res.status(201).json(newMovie);
    })
    .catch(error => {
      handleErrors(res, 500, 'Internal Server Error');
    });
});


//all movie thunder client
app.get('/api/Movies', (req, res) => {
  const { page, perPage, title } = req.query;
  const query = title ? { title: new RegExp(title, 'i') } : {};
  
  Movie.find(query).skip((page - 1) * perPage).limit(parseInt(perPage)).sort({ 'imdb.rating': -1 }).then((movies) => {
    res.send(movies);
  })

    .catch(error => {
      handleErrors(res, 500, 'Internal Server Error');
    });
});

// search movie handlebar
app.get('/api/Moviesh', verifyToken, (req, res) => {

  res.render('searchMovie');
}

);
app.post('/api/Moviesh', verifyToken, async (req, res) => {

  const { page, perPage, title } = req.body;
  const query = title ? { title: new RegExp(title, 'i') } : {};

  console.log(req.body)
  console.log(query)
  Movie.find(query).skip((page - 1) * perPage).limit(parseInt(perPage)).sort({ 'imdb.rating': -1 }).then((movies) => {
    res.render('searchMovieResult', {
      moviesData: movies
    });
  })

    .catch(error => {
      handleErrors(res, 500, 'Internal Server Error');
    });
});

// search movie with id as param thunder client
app.get('/api/Movies/:id', (req, res) => {
  Movie.findById(req.params.id)
    .then(movie => {
      if (!movie) {
        handleErrors(res, 404, 'Movie not found');
        return;
      }
      res.json(movie);
    })
    .catch(error => {
      handleErrors(res, 500, 'Internal Server Error');
    });
});



// Middleware for API key validation
const apiKeyMiddleware = (req, res, next) => {


  const apiKey = req.headers['api']; 
  console.log(apiKey);
  console.log(Api_Key);

  if (apiKey === Api_Key) {
    next(); 
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
};

app.use('/api/Movies/:id', apiKeyMiddleware);

// update movie info thunder client
app.put('/api/Movies/:id', apiKeyMiddleware, (req, res) => {
  Movie.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then(updatedMovie => {
      if (!updatedMovie) {
        handleErrors(res, 404, 'Movie not found');
        return;
      }
      res.json(updatedMovie);
    })
    .catch(error => {
      handleErrors(res, 500, 'Internal Server Error');
    });
});

//delete movie  thunder client
app.delete('/api/Movies/:id', apiKeyMiddleware, (req, res) => {
  Movie.findByIdAndDelete(req.params.id)
    .then(deletedMovie => {
      if (!deletedMovie) {
        handleErrors(res, 404, 'Movie not found');
        return;
      }
      res.json({ message: 'Movie deleted successfully' });
    })
    .catch(error => {
      handleErrors(res, 500, 'Internal Server Error');
    });
});