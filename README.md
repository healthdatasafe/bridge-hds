# ChartNeo To HDS Bridge

### Test deployment 

This code is currently running and deployed alongisde Pryv test server `chartneo-dev.datasafe.dev`

### Description

**Main task:** Handles the communication between Chartneo backend and HDS 

1. Provides URL with an `onboard Session Id` to be converted to QR to onboard a patient
2. Handles Creation of Patient on Pryv.io if needed
3. todo

##### Storage

A chartneo account is used for storage on HDS 
- TODO

### Install 

- `npm install`
- `npm run setup`
- `npm run setup-dev-env` (for dev environement)

Edit `localConfig.yml` you may get inspiration from `./config/default-config.js`

### In production 

Read [./NOTES_INSTALL_PRYV_AND_BRIDGE.md](./NOTES_INSTALL_PRYV_AND_BRIDGE.md) 

### DEV 

- `npm run test` for testing
- `npm run test:coverage` for coverage 

### TODOs

- [ ] design initialization flow
- [ ] endpoint to onboard patient
- [ ] define return parameters 
- [ ] create base stream structure for user
- [ ] Finalize base stream structure for user
- [ ] Add security to check request are comming from ChartNeo

### Bridge API

#### Static Routes & pages

#### `POST /user/onboard` Onboarding request

- **@spec** **[O1]**

- **@parms**

  - `chatneoUserId`: ChartneoUserId 

  - `returnURL`: The URL to return to 

- **@returns**

  - `xxx`: a URL to follow the onBoarding process


#### `GET /user/{chartneoUserId}/status`

- **@params**

  - `chartneoUserId` (from URL)

- **@returns** (status code 404 if not found)

  - Current patient status

    When an item has never been synchonized the time value is null.

    ```json
    {
      "result": {
        "hdsUserId": ".....",
        "lastSync": {
          "...": "..."
        }
      },
      "meta": {
        "serverTime": "<time: current Time>"
      }
    }
    ```

    Time is is milliseconds since 1970.

#### `POST /user/{chartneoUserId}/data`

handles RAW Pryv event conversion 

- **@spec [D1]**
- **@params**
  - `chartneoUserId` (from URL)
  - `data` - To be defined
- **@returns**
  - Returns - to be defined

### Functional specifications

##### Onboarding


## Install

Production: `npm run setup`
Development: `npm run setup-dev-env`

## RUN

- start dev: `npm run start`
- start prod: `npm run start:prod`
- tests: `npm run test`
- test and grep `npm run test:grep {string}`
- coverage: `npm run test:coverage`

Appending `LOGS=info`, `LOGS=errors` or `DEBUG="*"` will change the level of output
Example `DEBUG=*storage* npm run start` will show debug lines from storage

## CODE

Please use `npm run lint` to validate your changes before commiting

`npm run lint:fix` may fix some ;)

- Complete and use `errors.js` to generate coherent errors.
- For logging purposes check how `getLogger()` works
- Jsdoc is your friend
- Pull Request is good, use it when you want reviews. If your confident with your code, just push (and tell others).
- A sample test is present -- please write tests to achieve the best coverage.
