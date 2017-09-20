const
  config = require('config'),
  express = require('express'),
  app = express(),
  partials = require('express-partials'),
  favicon = require('serve-favicon'),
  session = require('express-session'),
  ejs = require('ejs'),
  passport = require(`${__dirname}/passport`),
  Twitter = require('twitter'),
  crypto = require("crypto"),
  server = require("http").createServer(app),
  io = require("socket.io")().attach(server),
  cluster = require('cluster'),
  sticky = require('sticky-session'),
  port = process.env.PORT || config.get('server.port');

if (!sticky.listen(server, port)) {
  console.log(`${config.get('server.name')} | port: ${port}`);
  return;
}

console.log(`Started on thread ${cluster.worker.id}`);

app.disable('x-powered-by');

app.use(partials());

// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(`${__dirname}/public/favicon.ico`));
app.use(express.static(`${__dirname}/public`));

app.use(session({
  secret: config.get('server.session_secret'),
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => (req.originalUrl.match(/^\/(reset|auth\/.*)$/) || req.isAuthenticated()) ? next() : res.redirect('/auth/twitter'));

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: '/login',
    failureRedirect: '/auth/twitter'
  })
);

app.get('/', (req, res) => {
  let limit = 300;

  if (req.query.limit) limit = req.query.limit

  res.render('index.ejs', {
    title: config.get('server.name'),
    token: req.user.twitter_token,
    token_secret: req.user.twitter_token_secret,
    limit: limit
  });
});

app.get('/login', (req, res) => {
  res.render('login.ejs', {
    title: config.get('server.name'),
    name: req.user.username,
    pass: req.user.displayName
  });
});

app.get('/reset', (req, res) => {
  req.logout();
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use((req, res, next) => res.sendStatus(404));

// error handler
app.use((err, req, res, next) => res.redirect('/reset'));

let
  sockets = {},
  twitters = {};

io.sockets.on('connection', socket => {
  socket.emit('init');

  socket.on('init', data => {
    let hash = crypto.createHash('sha512').update(data.token).update(data.token_secret).digest('hex');

    socket.join(hash);

    sockets[socket.id] = hash;

    if (io.sockets.adapter.rooms[hash].length === 1) {
      twitters[hash] = new Twitter({
        consumer_key: config.get('api-keys.twitter.ck'),
        consumer_secret: config.get('api-keys.twitter.cs'),
        access_token_key: data.token,
        access_token_secret: data.token_secret
      });

      twitters[hash].stream('user', {}, stream => {
        stream.on('data', data => {
          data.user.profile_image_url_https = data.user.profile_image_url_https.replace(/normal/g, 'bigger');

          io.to(hash).emit('tweet', data);
        });

        stream.on('delete', data => io.to(hash).emit('delete', data.delete.status.id_str));

        stream.on('error', error => io.to(hash).emit('err', error.message));

        twitters[hash].stream = stream;
      });
    }

    socket.emit('tweet', {
      id_str: new Date().getTime(),
      text: 'connecting',
      user: {
        screen_name: 'momizicode',
        profile_image_url_https: '/img/info.png'
      }
    });
  });

  socket.on('tweet', content => twitters[sockets[socket.id]].post('statuses/update', { status: content }, (error, tweet, response) => { }));

  socket.on('disconnect', () => {
    if (!io.sockets.adapter.rooms[sockets[socket.id]]) {
      twitters[sockets[socket.id]].stream.destroy();
      delete twitters[sockets[socket.id]];
    }

    delete sockets[socket.id];
  });
});
