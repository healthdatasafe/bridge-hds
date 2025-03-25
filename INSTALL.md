# Install notes for Pryv + Bridge on the same VM

Names should point to the same IP  `chartneo-bridge-dev.datasafe.dev` and  `demo.datasafe.dev` 

## Machine should be prepared like for Open-Pryv.io

## Add chartneo-bridge-dev to nginx

Add the folowing files "as root" to `/etc/nginx/sites-enabled`

File: `chartneo-bridge-dev`

```
server {
  server_name chartneo-bridge-dev.datasafe.dev;
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

Clone `bridge-chartneo-hds`   

- Run:
  - `npm install`
  - `npm run setup`
- Edit `locaConfig.yml` and change `baseUrl` to `https://chartneo-bridge-dev.datsafe.dev`
- run `screen -S chartneo` 
  1. from screen run `npm run start:prod`
  2. from another terminal test install with `curl http://127.0.0.1:7432/` 
     => should get "Found. Redirecting to ..."
  3. From a webpage open https://chartneo-bridge-dev.datsafe.dev
  4. You can now "detach" screen with Ctr+A  and Ctr+D, 
     Come back to the screen with `screen -r chartneo` 