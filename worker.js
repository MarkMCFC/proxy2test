export default {
  async fetch(request, _env) {
    return handleRequest(request);
  },
};

async function handleRequest(request) {
  const reqHeaders = new Headers(request.headers);
  let outBody, outStatus = 200, outStatusText = "OK", outCt = null;
  const outHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders.get("Access-Control-Allow-Headers") || 
      "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token"
  });

  try {
    // Extract target URL from path
    let url = request.url.replace(/^https?:\/\//, "");
    url = decodeURIComponent(url.substring(url.indexOf("/") + 1));

    // Ignore OPTIONS or invalid requests
    if (
      request.method === "OPTIONS" ||
      url.length < 3 ||
      url.indexOf(".") === -1 ||
      url === "favicon.ico" ||
      url === "robots.txt"
    ) {
      const invalid = !(request.method === "OPTIONS" || url.length === 0);
      outBody = JSON.stringify({
        code: invalid ? 400 : 0,
        usage: "Host/{URL}",
        source: "https://forum.tfms.xyz",
        note: "Join https://forum.tfms.xyz"
      });
      outCt = "application/json";
      outStatus = invalid ? 400 : 200;
    } else {
      url = fixUrl(url);

      // Build fetch options
      const fetchOptions = { method: request.method, headers: {} };
      const dropHeaders = ["content-length", "content-type", "host"];

      for (let [k, v] of reqHeaders.entries()) {
        if (!dropHeaders.includes(k)) fetchOptions.headers[k] = v;
      }

      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
        const ct = (reqHeaders.get("content-type") || "").toLowerCase();

        if (ct.includes("application/json")) fetchOptions.body = JSON.stringify(await request.json());
        else if (ct.includes("application/text") || ct.includes("text/html")) fetchOptions.body = await request.text();
        else if (ct.includes("form")) fetchOptions.body = await request.formData();
        else fetchOptions.body = await request.blob();
      }

      const fr = await fetch(url, fetchOptions);
      outCt = fr.headers.get("content-type");
      outStatus = fr.status;
      outStatusText = fr.statusText;
      outBody = fr.body;
    }
  } catch (err) {
    outCt = "application/json";
    outBody = JSON.stringify({ code: -1, msg: err?.stack || String(err) });
    outStatus = 500;
  }

  if (outCt) outHeaders.set("content-type", outCt);

  return new Response(outBody, {
    status: outStatus,
    statusText: outStatusText,
    headers: outHeaders
  });
}

function fixUrl(url) {
  if (url.includes("://")) return url;
  if (url.includes(":/")) return url.replace(":/", "://");
  return "http://" + url;
}