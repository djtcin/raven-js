/*global ErrorUtils:false*/

/**
 * react-native plugin for Raven
 *
 * Usage:
 *   var Raven = require('raven-js');
 *   require('raven-js/plugins/react-native')(Raven);
 */
'use strict';

var DEVICE_PATH_RE = /^\/var\/mobile\/Containers\/Bundle\/Application\/[^\/]+\/[^\.]+\.app/;
function normalizeUrl(url) {
    return url
        .replace(/^file\:\/\//, '')
        .replace(DEVICE_PATH_RE, '');
}

function reactNativePlugin(Raven) {
    function urlencode(obj) {
        var pairs = [];
        for (var key in obj) {
          if ({}.hasOwnProperty.call(obj, key))
            pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
        }
        return pairs.join('&');
    }

    function xhrTransport(options) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function (e) {
            if (request.readyState !== 4) {
                return;
            }

            if (request.status === 200) {
                if (options.onSuccess) {
                    options.onSuccess();
                }
            } else {
                if (options.onError) {
                    options.onError();
                }
            }
        };

        request.open('POST', options.url + '?' + urlencode(options.auth));
        // Sentry expects an Origin header when using HTTP POST w/ public DSN.
        // Just set a phony Origin value; only matters if Sentry Project is configured
        // to whitelist specific origins.
        request.setRequestHeader('Origin', '<React Native>');
        request.send(JSON.stringify(options.data));
    }

    // react-native doesn't have a document, so can't use default Image
    // transport - use XMLHttpRequest instead
    Raven.setTransport(xhrTransport);


    // Use data callback to strip device-specific paths from stack traces
    Raven.setDataCallback(function (data) {
        if (data.culprit) {
          data.culprit = normalizeUrl(data.culprit);
        }

        if (data.exception) {
          // if data.exception exists, all of the other keys are guaranteed to exist
          data.exception.values[0].stacktrace.frames.forEach(function (frame) {
            frame.filename = normalizeUrl(frame.filename);
          });
        }
    });

    ErrorUtils.setGlobalHandler(Raven.captureException.bind(Raven));
}

module.exports = reactNativePlugin;
