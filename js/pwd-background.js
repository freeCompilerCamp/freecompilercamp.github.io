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
 * This wrapper contains client-side functions for using PWD without having to
 * create a terminal in the browser; i.e., in the background. We use it for
 * closed-book testing in FreeCompilerCamp.
 *
 * All of the following is based on the API endpoints of PWD SDK - we just
 * include only the parts we need.
 * See: https://github.com/play-with-docker/sdk/blob/master/index.js
 *
 * Justin Gosselin | 07/21/2020
*/

// TODO: There are many other endpoints that may be useful (see handler dir in
// Go PWD server)
// TODO: better error processing on HTTP requests
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

      self.opts.baseUrl = self.opts.baseUrl.split('/')[0] + '//' + resp.hostname;
      self.sessionId = resp.session_id; // each pwdbg instance has one session

      // Create an instance for this session
      self.createInstance(opts, function(resp) {
          var i = resp;
          // here we are assuming there is only ONE instance for a session
          self.instances = i; // add instance to container

          if (cb) {
            cb(resp); // callback upon successful session + instance creation
          }
      });
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

  // This is supposed to be added by default with an ajax call, but it seems
  // that PWD is explicitly looking for it.

  $.ajax({
    url: this.opts.baseUrl + '/',
    data: encodeURIComponent('session-duration') + '=' + encodeURIComponent('90m'),
    contentType: 'application/x-www-form-urlencoded',
    headers: {'X-Requested-With': 'XMLHttpRequest'},
    method: 'POST',
    type: 'POST', // For jQuery < 1.9
    success: function(r) {
      cb(r);
    },
    error: function(e) {
      console.error('Could not create PWC session.');
    }
  });
}

/*
 * Performs the HTTP request to create an instance within a session.
*/
PwdBg.prototype.createInstance = function(opts, cb) {

  opts.ImageName = opts.ImageName || this.opts.ImageName;
  opts.Envs = opts.InstanceEnvs || this.opts.InstanceEnvs;

  $.ajax({
    url: this.opts.baseUrl + '/sessions/' + this.sessionId + '/instances',
    data: opts,
    contentType: 'application/json',
    headers: {'X-Requested-With': 'XMLHttpRequest'},
    method: 'POST',
    type: 'POST', // For jQuery < 1.9
    success: function(r) {
      cb(r);
    },
    error: function(e) {
      console.error('Could not create PWC instance.');
    }
  });

}

/*
 * Performs the HTTP request to close a session.
 * We don't actually call this anywhere in the API. Like PWD, the expectation
 * is that the user closes the session when done, e.g., on window unload.
 * In any case, sessions are closed after a set amount of time.
*/
PwdBg.prototype.closeSession = function(cb) {

  if (this.sessionId) {
    $.ajax({
      url: this.opts.baseUrl + '/sessions/' + this.sessionId,
      contentType: 'application/application/json',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
      method: 'DELETE',
      type: 'DELETE', // For jQuery < 1.9
      success: function(r) {
        cb(r);
      },
      error: function(e) {
        console.error('Could not close PWC session.');
      }
    });
  }

}

/*
 * Performs the HTTP request for uploading to an instance.
 * This is not called within the API, but is provided as a user function.
 * We use it in PWC for upload source code for closed-book testing.
*/
PwdBg.prototype.upload = function(name, path, data, cb) {

  $.ajax({
      url: this.opts.baseUrl + '/sessions/' + this.sessionId + '/instances/'
            + name + '/uploads?path=' + path,
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      method: 'POST',
      type: 'POST',
      success: function(data) {
        console.log("Successfully uploaded file to instance.");
        cb(data);
      }
  });
}

/*
 * Sets the options for this instance. If none provided, creates default opts.
 * We keep the same format as PWD for consistency.
*/
function setOpts(opts) {
  var opts = opts || {};
  this.opts = opts;
  this.opts.baseUrl = this.opts.baseUrl || '{{ site.pwdurl }}';
  this.opts.ports = this.opts.ports || [];
  this.opts.ImageName = this.opts.ImageName || '';
  this.opts.InstanceEnvs = this.opts.InstanceEnvs || [];
  this.opts.oauthProvider = this.opts.oauthProvider || 'docker';
}
