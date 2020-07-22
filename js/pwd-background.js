// MIT License
//
// Copyright (c) 2016 Marcos Lilljedhal and Jonathan Leibiusky
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/*
 * This class contains client-side functions for using PWD without having to
 * create a terminal in the browser; i.e., in the background. We use it for
 * closed-book testing in FreeCompilerCamp.
 *
 * All of the following is based on the API endpoints of PWD SDK - we just
 * include only the parts we need.
 * See: https://github.com/play-with-docker/sdk/blob/master/index.js
 *
 * Justin Gosselin | 07/21/2020
*/

'use strict';

// PWD object for background only
var PwdBg = function() {
  this.instances = {};
  return;
}

PwdBg.prototype.constructor = PwdBg;

/*
 * Creates a new PWD session in the "background"; i.e., does not do any frontend
 * processing (creating terminals, web socket, etc.).
 * Session includes a session itself and one instance within the session.
 *
 * Callback function can be optionally provided and is fired once an instance
 * has been created for the session.
*/
PwdBg.prototype.newSession = function(opts, cb) {

  var self = this;

  setOpts.call(this, opts);

  this.createSession(function(resp) {
    if (resp.status == 200) {

      var sessionData = JSON.parse(resp.responseText);

      self.opts.baseUrl = self.opts.baseUrl.split('/')[0] + '//' + sessionData.hostname;
      self.sessionId = sessionData.session_id; // each pwdbg instance has one session

      // Create an instance for this session
      self.createInstance(opts, function(resp) {
        if (resp.status == 200) {
          var i = JSON.parse(resp.responseText);
          self.instances[i.name] = i; // add instance to container

          if (cb) {
            cb(resp); // callback upon successful instance creation
          }
        } else {
          console.error('Could not create PWC instance.');
        }
      });

    } else {
      console.error('Could not create PWC session.');
    }
  });

}

/*
 * Performs the HTTP request to create a session.
*/
PwdBg.prototype.createSession = function(cb) {

  // Ok, so, apparently you HAVE to specify X-Requested-With as
  // XMLHttpRequest in the header... see line 102 of handler/new_session.go in
  // PWD. This is because the fallback when not provided assumes that this is
  // a form submission and sends a 302 (redirect) to /p/<sessionId>, which is
  // the playground URL.

  // No success using ajax - had to explicitly use XMLHttpRequest. The
  // X-Requested-With header wasn't being passed to the server with the ajax
  // request for whatever reason.

  // Request information
  var request = new XMLHttpRequest();
  var endpoint = this.opts.baseUrl + '/';
  var method = 'POST';

  // Data to send with the request
  var data = encodeURIComponent('session-duration') + '=' + encodeURIComponent('90m');

  request.open(method, endpoint, true); // async (last parameter)

  // Set headers
  request.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
  request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

  request.onload = function() {
    cb(request);
  }

  request.send(JSON.stringify(data));
}

/*
 * Performs the HTTP request to create an instance within a session.
*/
PwdBg.prototype.createInstance = function(opts, cb) {

  opts.ImageName = opts.ImageName || this.opts.ImageName;
  opts.Envs = opts.InstanceEnvs || this.opts.InstanceEnvs;

  var request = new XMLHttpRequest();
  var endpoint = this.opts.baseUrl + '/sessions/' + this.sessionId + '/instances';
  var method = 'POST';

  var data = opts;

  request.open(method, endpoint, true);

  request.setRequestHeader('content-type', 'application/json');
  request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

  request.onload = function() {
    cb(request);
  }

  request.send(JSON.stringify(data));

}

/*
 * Performs the HTTP request to close a session.
 * We don't actually call this anywhere in the API. Like PWD, the expectation
 * is that the user closes the session when done, e.g., on window unload.
 * In any case, sessions are closed after a set amount of time.
*/
PwdBg.prototype.closeSession = function(cb) {

  if (this.sessionId) {
    var request = new XMLHttpRequest();
    var endpoint = this.opts.baseUrl + '/sessions/' + this.sessionId;
    var method = 'DELETE';

    request.open(method, endpoint, true);

    request.setRequestHeader('content-type', 'application/json');
    request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    request.onload = function() {
      cb(request);
    }

    request.send(JSON.stringify(data));
  }

}

/*
 * Performs the HTTP request for uploading to an instance.
 * This is not called within the API, but is provided as a user function.
 * We use it in PWC for upload source code for closed-book testing.
*/
PwdBg.prototype.upload = function(instanceName, data, cb) {

  var request = new XMLHttpRequest();
  var endpoint = this.opts.baseUrl + '/sessions' + this.sessionId + '/instances/'
                    + name + '/uploads';
  var method = 'POST';

  request.open(method, endpoint, true);

  request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

  request.onload = function() {
    cb(request);
  }

  request.send(JSON.stringify(data));
}

/*
 * Sets the options for this instance. If none provided, creates default opts.
 * We keep the same format as PWD for consistency.
*/
function setOpts(opts) {
  var opts = opts || {};
  this.opts = opts;
  this.opts.baseUrl = this.opts.baseUrl || 'https://lab.freecompilercamp.org';
  this.opts.ports = this.opts.ports || [];
  this.opts.ImageName = this.opts.ImageName || '';
  this.opts.InstanceEnvs = this.opts.InstanceEnvs || [];
  this.opts.oauthProvider = this.opts.oauthProvider || 'docker';
}
