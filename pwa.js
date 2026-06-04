if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    const basePath = location.hostname.endsWith("github.io") ? "/yuanweigou/" : "/";
    navigator.serviceWorker.register(`${basePath}sw.js`).catch(() => {});
  });
}
