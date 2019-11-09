# twittersignin

This library exists because Twitter's Sign In With Twitter flow is substantially different from the rest of its APIs. It's also terribly documented.

Here are some of the differences:
1. The flow sends params as form data, not JSON or query params like the other APIs.
2. The flow uses some additional OAuth parameters (`callback`) which must be included in the OAuth header.
3. The success response is in query string format, not JSON.
4. Some error responses are in XML format (Yep!), others are in JSON, others are just plain strings.

It's easy to get a lot wrong. It's very likely you'l spend hours implementing Sign In With Twitter. This library aims to make it simple by abstracting away the differences and problems.

Internally, this library is a wrapper around [Twit](https://github.com/ttezel/twit) (pinned at version 2.2.11). Twit provides a nice, consistent interface for accessing the Twitter APIs, but does not support these Twitter Sign In APIs. This library modifies some of Twit's internal behaviour to support them. The success responses are the same as the `data` object in Twit, and the errors thrown are the same as when using Twit. 

## Usage
Install via npm:

```bash
npm i twittersignin
```

- Initialise with your app's default credentials:

```js
const twitterSignIn = require('twittersignin')({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});
```

As described by [the Twitter docs](https://developer.twitter.com/en/docs/twitter-for-websites/log-in-with-twitter/guides/implementing-sign-in-with-twitter), the sign in process is in 4 steps:

> ⚠ Make sure to go through the Twitter doc first, as this is only intended to complement that.

### Step 1—When the user clicks "Sign in with Twitter": Fetch a request token from Twitter
Create a link on your web page that points to a route on your backend. This is the route your user gets taken to when they click "Sign in to Twitter". In this route, your backend should fetch a request token from Twitter. Here's how to do that:

```js
    const response = await twitterSignIn.getRequestToken();
const requestToken = response.oauth_token;
const requestTokenSecret = response.oauth_token_secret;
const callbackConfirmed = oauth_callback_confirmed;
```

You can pass in optional parameters:
```js
await twitterSignIn.getRequestToken({
        oauth_callback: "https://yourcallback.url?query=param",
        x_auth_access_type: "read",
    })
```

The response contains three parameters:
- `oauth_callback_confirmed`: You should check that this value === `true` first. 
- `oauth_token`. This is the request token. You'll use it in the next step.
- `oauth_token_secret`: This is the request token secret. You'll need it in the third step. 

> ⚠ Make sure to store the `requestTokenSecret` somewhere. I recommend a cache, so you can easily expire it after a few minutes(the token is short-lived).
> Here's one way to store it (using Redis):`redis.set(`tokens-${requestToken}`, requestTokenSecret, 'EX', 5 * 60);`Here, we're storing it with the token as key, so we can easily look it up in Step 3.


### Step 2—Redirect the user to Twitter
When you have the request token, the next step is to redirect the user to Twitter. Make sure it's a 302 (temporary) redirect, so browsers don't cache it!
You can redirect either to `/oauth/authenticate` for one-time auth, or `/oauth/authorize` if you want the user to always have to authorize your app.

```js
res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${requestToken}`, 302);
```

The user's browser will then take them to Twitter where they can sign in to Twitter (if needed) and authorize your app.

When the authorization is successful, Twitter will redirect to your provided callback URL with two query parameters (in addition to any you added when calling `getRequestToken`):
- `oauth_token`: Same value as the `oauth_token` in Step 1 (the request token).
- `oauth_verifier`: some random string

 ### Step 3—When Twitter redirects to your app: Get an access token
 Next, your callback URL needs to handle the redirect from Twitter. You want to get an access token. This will allow you to ac as the user (get their account details, read their timeline, post tweets and so on—depending on your earlier requested permissions).
 
 Here's how to get an access token:
 
 ```js
// Get the oauth_verifier query parameter
const oauthVerifier = req.query.oauth_verifier;
// Get the oauth_token query parameter. 
// It's the same as the request token from step 1
const requestToken = req.query.oauth_token;
// Get the request token secret from whjere we stored it (Step 1)
const requestTokenSecret = await redis.get(`tokens-${requestToken}`);

const response = await twitterSignIn.getAccessToken(requestToken, requestTokenSecret, oauthVerifier);

```

We're done! The response should contain four values:
- `oauth_token`: The access token for the user
- `oauth_token_secret`: The access token secret for the user
- `screen_name`: user's Twitter username
- `user_id`

### Step 4 (Optional)—Fetch the user
Once you have the access token and access token secret, you can interact with the Twitter API as you would normally, but with the user's tokens to act as that user. For instance:
```js
const Twit = require("twit");
const t = new Twit({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken,
    accessTokenSecret,
});
// Fetch the user's mentions
await t.get('statuses/mentions_timeline');
```

If you just want to fetch the user's profile, this package includes a convenience method to help with that:

```js
const user = twitterSignIn.getUser(accessToken, accessTokenSecret);
if (user.followers_count > 1000) {
 // ...
}
```

## Important info
### Responses
This package returns the `data` section from Twit responses, so you can get directly to the data you need.

### Error handling
Error handling in this package is designed to be the same as Twit. Anything other than success responses will reject with an error. The errors are in this format:

```
{
    // HTTP status code
    statusCode: number,

    // Simplified error message
    message: string,

    // Twitter API error code
    code: number,
    
    // List of errors. Usually these errors are of the form {code: string, message: string}
    // But they may also be strings
    allErrors: [], 

    // Full response from Twitter. JSON-parsed where possible.
    twitterReply: object|string, 
}
```

## Doing more work with the Twitter API?
Check out some of my other libraries:

- [twitter-error-handler](https://github.com/shalvah/twitter-error-handler)
- [aargh](https://github.com/shalvah/aargh)