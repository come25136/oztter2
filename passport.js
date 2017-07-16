const
    config = require('config'),
    passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(new TwitterStrategy({
    consumerKey: config.get('api-keys.twitter.ck'),
    consumerSecret: config.get('api-keys.twitter.cs'),
    callbackURL: `http://${config.get('server.domain')}:${config.get('server.port')}/auth/twitter/callback`
},
    (token, tokenSecret, profile, done) => {
        profile.twitter_token = token;
        profile.twitter_token_secret = tokenSecret;

        return done(null, profile);
    }
));

module.exports = { passport: passport };
