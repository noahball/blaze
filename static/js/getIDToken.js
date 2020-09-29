// ID tokens are automagically grabbed each time you visit a page, as they expire once every hour.
// They are essential for connecting and generating pages via Blaze's backend services.
// If ID tokens expire, you will be redirected to the login page by the backend server.
// ID tokens are JWTs, that can be decoded by Blaze's backend server to form your User ID - which is what identifies you.

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        firebase.auth().currentUser.getIdToken( /* forceRefresh */ true).then(function (idToken) {
            console.log(idToken); // Logged for development purposes. This should not appear in production as it is considered a huge security flaw.
            document.cookie = `sessionid=` + idToken + `; expires=Thu, 18 Dec 2025 12:00:00 UTC; path=/`; // Stored in a cookie that is read by the backend server on page load.
        }).catch(function (error) {
            console.log(`ID Token failure.\n\nDEBUG INFORMATION FOR NERDS:\n\n` + error)
        });
    } else {
      console.log('Not signed in. This should not be handled client-side.') // This really shouldn't happen since the request would be blocked client side before the page is served.
    }
  });