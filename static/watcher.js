function watch(host) {
  var socket = new WebSocket(`ws://${host}`);
  var showLoading = (function () {
    var spinner = document.createElement('paper-spinner');
    spinner.setAttribute('style', 'position: absolute; top: 50%; left: 50%; margin-top:-14px ;margin-left: -14px;z-index: 9999;');
    spinner.active = true;
    document.body.appendChild(spinner);
    return function (show) {
      spinner.active = show !== false;
    }
  })();
  var loadRaml = (function () {
    var api = document.querySelector('api-console');
    var old = undefined;
    return function (raml) {
      old = {
        page: api.page,
        path: api.path,
        top: api.scrollTarget.scrollTop
      }

      api.raml = raml;
      api.page = old.page;
      api.path = old.path;
      api.scrollTarget.scrollTop = old.top;
    }
  })();
  var toast = (function () {
    var toast = document.createElement('paper-toast');
    document.body.appendChild(toast);
    toast.dataset.bridgeError = true;
    return function (message, duration, isError) {
      toast.hide();
      toast.duration = isNaN(duration) ? 1000 : duration;
      toast.text = message;
      toast.style.backgroundColor = isError ? '#d32f2f' : '#323232';
      toast.show();
    };
  })();
  var showError = (function () {
    var dialog = document.createElement('paper-dialog');
    dialog.setAttribute('style', 'min-width: 33%;');
    document.body.appendChild(dialog);
    return function (message) {
      if (message) {
        dialog.innerHTML = '<div style="">' + message + '</div>';
        dialog.opened = true;
      } else {
        dialog.innerText = '';
        dialog.opened = false;
      }
    }
  })();
  socket.addEventListener('message', function (data) {
    var message = JSON.parse(data.data);
    if (message.payload === 'error') {
      showLoading(false);
      showError(message.message);
    } else {
      showError();
      if (message.payload === 'loading') {
        showLoading();
      } else {
        showLoading(false);
        loadRaml(message.data);
        toast('Raml Loaded');
      }
    }
  });
  socket.addEventListener('close', function () {
    toast('Offline', 0, true);
  });
}
window.addEventListener('WebComponentsReady', function () {
  watch(location.host + location.pathname);
});