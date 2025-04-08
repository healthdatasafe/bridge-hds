# Install notes 

## Machine should be prepared like for Open-Pryv.io

## Add {partner}-bridge-dev to nginx

Add the folowing files "as root" to `/etc/nginx/sites-enabled`

File: `{partner}-bridge-dev`

```
server {
  server_name {partner}-bridge-dev.datasafe.dev;
	location / {
      proxy_pass  http://localhost:7432;
      proxy_set_header    Host                $http_host;
      proxy_set_header    X-Real-IP           $remote_addr;
      proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
      proxy_set_header    X-Forwarded-Proto   $scheme;
  }
}
```



- Then create the ssl certficates with: `certbot --nginx`
- ⚠️: check if ``systemctl list-timers`  which list certbot really works otherwise put it in crontab


## Install Bridge

To deploy the bridge you need to create a "personal access token" On github with "read" access rights

For some reason I didn't manage to create an "per-repo" access token

Clone `bridge-hds`   

- Run:
  - `npm install`
  - `npm run setup`
- Edit `locaConfig.yml` and change `baseURL` to `https://{partner}-bridge-dev.datsafe.dev`
- run `screen -S bridge` 
  1. from screen run `npm run start:prod`
  2. from another terminal test install with `curl http://127.0.0.1:7432/` 
     => should get "Found. Redirecting to ..."
  3. From a webpage open https://{partner}-bridge-dev.datsafe.dev
  4. You can now "detach" screen with Ctr+A  and Ctr+D, 
     Come back to the screen with `screen -r bridge` 