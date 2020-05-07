'use strict';
import {config} from './config.js';
import GitHub from 'github-api';

export var github;
export var currentUser;

export function login(user, password) {

  github = new GitHub({
     username: user,
     token: password
  });

  return new Promise(function (resolve, reject) {
    // github.getUser().getProfile().then(function() {
    github.getRepo(config.githubInfo.owner, config.githubInfo.repo).getCollaborators().then(function() {
      currentUser = user;
      resolve();
    }, function (error) {
      currentUser = undefined;
      github = undefined;
      reject(error);
    });
  });

}

export function getRepo() {
  return github.getRepo(config.githubInfo.owner, config.githubInfo.repo);
}

export function getDataPath() {
  return 'https://api.github.com/repos/' + config.githubInfo.owner + '/' + config.githubInfo.repo + '/contents/';
}

export function logoff() {
  currentUser = undefined;
  github = undefined;
}
