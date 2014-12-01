'use strict';

angular.module('fastCache', []);

angular.module('fastCache').controller('HomeCtrl', function ($scope, API, Cache) {

  $scope.$watch('query', function (newQuery, oldQuery) {
    if (typeof newQuery === 'undefined' || newQuery.length < 1 || newQuery === oldQuery) {
      return;
    }

    API.search(newQuery).then(function (tracks) {
      $scope.results = tracks;
    });
  });

});


angular.module('fastCache').service('Cache', function ($document, $q) {
  var dbName = 'spotify_query_cache';

  var dbOpenRequest = indexedDB.open(dbName, 1);

  var db;

  dbOpenRequest.onerror = function (event) {
    console.log('error opening db');
  };

  dbOpenRequest.onupgradeneeded = function (event) {
    db = event.target.result;

    var objectStore = db.createObjectStore('results', { keyPath: 'query' });

    objectStore.transaction.oncomplete = function (event) {
      var resultsObjectStore = db.transaction('results', 'readwrite').objectStore('results');
    };
  };

  dbOpenRequest.onsuccess = function (event) {
    db = event.target.result;
  };

  this.clear = function () {
    indexedDB.deleteDatabase('spotify_query_cache');
  }

  this.set = function (queryResultsObj) {
    var deferred = $q.defer();

    var transaction = db.transaction(['results'], 'readwrite');

    transaction.oncomplete = function (event) {
      console.log('transaction finished');
    };

    transaction.onerror = function (event) {
      console.log('transaction failed');
    };

    var objectStore = transaction.objectStore('results');

    var request = objectStore.add(queryResultsObj);

    request.onsuccess = function (event) {
      console.log('success storing queryResultsObj');
    };

    request.onerror = function (event) {
      console.log('error storing queryResultsObj');
    };

    return deferred.promise;
  };

  this.get = function (query) {
    var deferred = $q.defer();

    var transaction = db.transaction(['results']);
    var objectStore = transaction.objectStore('results');

    var request = objectStore.get(query);

    request.onerror = function (event) {
      console.log('error retrieving result');
    };

    request.onsuccess = function (event) {
      var response = event.target.result;
      deferred.resolve(response ? response.tracks : response);
    };

    return deferred.promise;
  };
});

angular.module('fastCache').service('API', function ($http, $q, Cache) {
  var url = 'https://api.spotify.com/v1/search?q={queryTerm}&limit=50&type=album,artist,track';

  function getQueryUrl (term) {
    return url.replace('{queryTerm}', term);
  }

  this.search = function (query) {
    var deferred = $q.defer();

    Cache.get(query).then(function (results) {
      if (typeof results !== 'undefined') {
        deferred.resolve(results);
      }
      else {
        $http.get(getQueryUrl(query))
          .then(function (response) {
            var tracks = response.data.tracks.items;
            return tracks;
          })
          .then(function (tracks) {
            Cache.set({
              query: query,
              tracks: tracks
            });

            deferred.resolve(tracks);
          });
      }
    });

    return deferred.promise;
  };

});
