Inventory Count Mobile App SDK
# Build Notes

### Clone the repository (code)

- Open a Terminal window
- Clone app
- Go to app directory
- Run following command to download dependencies 
    npm i

### Start App

- To test the app in browser: ionic serve

https://ionicframework.com/docs/intro/cli
To install Ionic CLI, follow instructions in the link

#### Upload instance specific build

- While adding new configuration, make sure to add them in all of three environments file otherwise it will be missing while building the app for prod or qa instance.
- Improve the environment variables as per the instance before building the app.
- Version must be updated before building the app.
- For dev build, improve the environment variables in environment.ts file and for prod build, improve the environment variables in environment.prod.ts file.
- Run the command `gulp config --channelTag=<dev/prod/qa>`
- After running this command we will have updated environment.ts file and config.xml file as per the updated variables.
- Next we can build the app using `ionic cordova build <android/ios>`
- Upload app on test flight, mention the app release version and what to test under Test Details.

#### Generating artefact documentation

Following command generates the documentation:  
`npm run compodoc`  
Documentation is available in the documentation folder and can be viewed by opening the index.html.  

### Shopify app configuration and installation
- Add API Key, Redirect URI and Scopes to environment.
- For development store, navigate to /shopify page and input shopify store URL
- For demo store, Generate custom link and install 

## Build Issues
### If you face any error while running the app on a local machine, please refer [this](https://stackoverflow.com/questions/58973192/uncaught-typeerror-object-is-not-a-function-when-using-angular-google-maps).
- Run following commands to fix the issue
    `npm uninstall @agm/core`
    `npm i @agm/core@1.0.0-beta.7 --save`

### UIWebView Issue while uploading App on testflight:
- Remove the ios platform using command 
    `ionic cordova platform rm ios`
- Check plugin cordova-plugin-ionic-webview in package.json file, If not included then add plugin using command
    `ionic cordova plugin add cordova-plugin-ionic-webview`
- Add the ios platform with version 5.1.0 using command
    `ionic cordova platform add ios@~5.1.0`
- Check following preference in config file . if not present then add it.
    `<preference name="WKWebViewOnly" value="true" />`
- Run following command
    `npm i`
- Build application for IOS 
    `ionic cordova build ios`

### moment-timezone and Truncate
- If you are getting error `Property 'tz' does not exist on type 'typeof moment'`
    `npm i moment-timezone@0.5.28`
- If you are getting error `A rest parameter must be of an array type.`
    `npm i @yellowspot/ng-truncate@1.5.0`

### Submodule - Theme 
- If you are getting `Sass Error` like `Undefined variable` 
   `git submodule update --recursive --remote`

### Contribution Guideline

`Please do all changes and in your local systems branch and make a pull request to hacktoberfest branch not in master branch of remote repo`
