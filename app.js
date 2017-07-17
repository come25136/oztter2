const
  config = require('config'),
  express = require('express'),
  app = express(),
  favicon = require('serve-favicon'),
  session = require('express-session'),
  path = require('path'),
  ejs = require('ejs'),
  auth = require(__dirname + '/passport'),
  passport = auth.passport,
  Twitter = require('twitter'),
  fs = require("fs"),
  server = require("http").createServer(app).listen(process.env.PORT || config.get('server.port'), function () {
    console.log(`${config.get('server.name')} | port: ${this.address().port}`);
  }),
  io = require("socket.io").listen(server);

app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: config.get('server.session_secret'),
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: '/login',
    failureRedirect: '/auth/twitter'
  })
);

app.get('/', (req, res) => {
  if (req.user) {
    let limit = 300;

    if (req.query.limit) {
      limit = req.query.limit;
    }

    res.render('index.ejs', {
      title: config.get('server.name'),
      token: req.user.twitter_token,
      token_secret: req.user.twitter_token_secret,
      limit: limit
    });
  } else {
    res.redirect('/auth/twitter');
  }
});

app.get('/login', (req, res) => {
  if (req.user) {
    res.render('login.ejs', {
      title: config.get('server.name'),
      name: req.user.username,
      pass: req.user.displayName
    });
  } else {
    res.redirect('/auth/twitter');
  }
});

app.get('/reset', (req, res) => {
  if (req.user) {
    req.logout();
    res.redirect('/');
  } else {
    res.redirect('/auth/twitter');
  }
});

// catch 404 and forward to error handler
app.use((req, res, next) => res.sendStatus(404));

// error handler
app.use((err, req, res, next) => res.redirect('/reset'));

let sockets = {};

io.sockets.on('connection', socket => {
  socket.emit('init');

  socket.on('init', data => {
    sockets[socket.id] = new Twitter({
      consumer_key: config.get('api-keys.twitter.ck'),
      consumer_secret: config.get('api-keys.twitter.cs'),
      access_token_key: data.token,
      access_token_secret: data.token_secret
    });

    // sockets[socket.id].stream('statuses/sample', { language: 'ja' }, stream => {
    sockets[socket.id].stream('user', {}, stream => {
      sockets[socket.id].stream = stream;

      stream.on('data', data => {
        data.user.profile_image_url_https = data.user.profile_image_url_https.replace(/normal/g, 'bigger');

        socket.emit('tweet', data);
      });

      stream.on('delete', data => socket.emit('delete', data.delete.status.id_str));

      stream.on('error', error => {
        socket.emit('err', error.message);
      });
    });

    socket.emit('tweet', {
      id_str: new Date().getTime(),
      text: 'connecting',
      user: {
        screen_name: 'momizicode',
        profile_image_url_https: '/img/info.png'
      }
    });
  });

  socket.on('tweet', (content) => sockets[socket.id].post('statuses/update', { status: content }, (error, tweet, response) => { }));

  socket.on('disconnect', () => {
    sockets[socket.id].stream.destroy();

    delete sockets[socket.id];
  });
});
