firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        // User is signed in.

        // window.location = "/servers";

        firebase.auth().currentUser.getIdToken( /* forceRefresh */ true).then(function (idToken) {
            console.log(idToken);
        }).catch(function (error) {
            // Handle error
        });


    }
});

function login() {
    var userEmail = document.getElementById("email").value;
    var userPass = document.getElementById("password").value;

    firebase.auth().signInWithEmailAndPassword(userEmail, userPass).catch(function (error) {
        var errorCode = error.code;
        var errorMessage = error.message;

        if (errorMessage == 'There is no user record corresponding to this identifier. The user may have been deleted.') {
            var simplifiedError = 'There is no account registered with this email address.'
        } else if (errorMessage == 'The password is invalid or the user does not have a password.') {
            var simplifiedError = 'Incorrect password.'
        } else {
            var simplifiedError = errorMessage;
        }

        Swal.fire({
            title: 'Uh oh',
            text: simplifiedError,
            icon: 'error',
        })
    });
}