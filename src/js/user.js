'use strict';
import GitHub from 'github-api';

export var github;
export var currentUser;

export function login(user, password) {

  github = new GitHub({
     username: user,
     password: password
  });

  return new Promise(function (resolve, reject) {
    // github.getUser().getProfile().then(function() {
    github.getRepo('oregonhowl', 'githubd').getCollaborators().then(function() {
      currentUser = user;
      resolve();
    }, function (error) {
      currentUser = undefined;
      github = undefined;
      reject(error);
    });
  });

}

export function logoff() {
  currentUser = undefined;
  github = undefined;
}
