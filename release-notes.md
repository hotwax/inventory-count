# Release 1.8.0

## What's Changed
* Implemented: logic to identify authorisations for the given user (#176) by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/177

**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.7.0...v1.8.0

# Release 1.7.0

## What's Changed
* PDP is scrollable now by @dt2patel in https://github.com/hotwax/inventory-count/pull/170
* Implemented: confirmation alert on inventory count upload (#85zrx64et) by @k2maan in https://github.com/hotwax/inventory-count/pull/173
* Improved: PR template by fixing typos, links and removed unwanted checks by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/174
* Implemented: option for logging inventory variance (#85zrx66zh) by @k2maan in https://github.com/hotwax/inventory-count/pull/175

## New Contributors
* @dt2patel made their first contribution in https://github.com/hotwax/inventory-count/pull/170

**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.6.0...v1.7.0
# Release 1.6.0

## What's Changed
* Fixed: Product data not fetched on refresh (#85zrvh9we) by @k2maan in https://github.com/hotwax/inventory-count/pull/167
* Fixed: missing facilities causing sideeffects when userprofile response is delayed by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/168


**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.5.0...v1.6.0

# Release 1.5.0

## What's Changed
* Implemented: support for using api and client method from oms api package(#85zrm1ktj) by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/160
* Implemented: Toast notification when camera permission is denied for scanner (#85zrk1af8) by @k2maan in https://github.com/hotwax/inventory-count/pull/159
* Implemented: alert on facility change when products are uploaded (#85zrmb9v7) by @k2maan in https://github.com/hotwax/inventory-count/pull/161
* Fixed: navigation to login failed for token expire (oms-api#61) by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/164


**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.4.0...v1.5.0

# Release 1.4.0

## What's Changed
* Added support to scan products with all the product identifications (#85zrjbtxf) by @k2maan in https://github.com/hotwax/inventory-count/pull/146
* Fixed 'backdrop' being searched on closing the scanner without scanning barcode by @k2maan in https://github.com/hotwax/inventory-count/pull/147
* fixed: incorrect facility locations on product detail page(#85zrgfqdj) by @disha1202 in https://github.com/hotwax/inventory-count/pull/149
* Added support to change timezone and migrated from moment to luxon(#25k8h53) by @k2maan in https://github.com/hotwax/inventory-count/pull/150 and by @disha1202 in https://github.com/hotwax/inventory-count/pull/90 and by @Mayank909 in https://github.com/hotwax/inventory-count/pull/88
* Implemented: Code to show app version & build information on Settings page (#85zrhn8w8) by @k2maan in https://github.com/hotwax/inventory-count/pull/153 and by @shashwatbangar in https://github.com/hotwax/inventory-count/pull/137
* fix: searched products not cleared if product not found on scanning or searching and on logout(#85zrkjneg) by @disha1202 in https://github.com/hotwax/inventory-count/pull/154 and https://github.com/hotwax/inventory-count/pull/156
* fix: warning in console when clicking scan button(#85zrkj2ud) by @disha1202 in https://github.com/hotwax/inventory-count/pull/152


**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.3.0...v1.4.0


# Release 1.3.0

## What's Changed
* Added hotwax-apps-theme package(#85zrj08rb) by @disha1202 in https://github.com/hotwax/inventory-count/pull/136
* Implemented: Updated UI of Settings page(#32j3r6t) by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/141 and by @shashwatbangar in https://github.com/hotwax/inventory-count/pull/123
* Updated code to disable the upload button when no products to upload (#85zrjcac7) by @k2maan in https://github.com/hotwax/inventory-count/pull/142

**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.2.0...v1.3.0

# Release 1.2.0

## What's Changed
* Fixed build issue due to eslint version mismatch in dependencies and removed warnings (#85zrhpak3) by @k2maan in https://github.com/hotwax/inventory-count/pull/133

## New Contributors
* @k2maan made their first contribution in https://github.com/hotwax/inventory-count/pull/133

**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.1.0...v1.2.0

# Release 1.1.0

## What's Changed
* Upgraded ionic 5 to ionic 6(#1yky426) by @disha1202 in https://github.com/hotwax/inventory-count/pull/35
* Upgraded ionic to 6.1.15(#2uaz29u) by @disha1202 in https://github.com/hotwax/inventory-count/pull/102
* Added support to alias specific instance URL with environment configuration(#30dkjp1) by @disha1202 in https://github.com/hotwax/inventory-count/pull/119
* Upgraded ionic to 6.2(#2w9wz26) by @disha1202 in https://github.com/hotwax/inventory-count/pull/116


**Full Changelog**: https://github.com/hotwax/inventory-count/compare/v1.0.1...v1.1.0

# Release 1.0.1

## What's Changed
* Added md mode (#1zax3p6) by @bashu22tiwari in https://github.com/hotwax/inventory-count/pull/57
* Improved code by using logo component for light and dark theme on login page (#1zw59ab) by @azkyakhan in https://github.com/hotwax/inventory-count/pull/58
* Improved position of scan button on search page (#1zaxn7d) by @azkyakhan in https://github.com/hotwax/inventory-count/pull/54
* Added padding bottom to page content to fix scan button and product list overlapping issue (#1zaxfqr) by @azkyakhan in https://github.com/hotwax/inventory-count/pull/59
* Added configuration to verify build on PR and commit by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/62
* Removed full screen from ion-content in all pages (#226cy65) by @azkyakhan in https://github.com/hotwax/inventory-count/pull/63
* Added PWA configuration by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/65
* Added: icons and manifest.json by @disha1202 in https://github.com/hotwax/inventory-count/pull/66
* Added: static value for the locationId when uploading products by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/67
* Updated manifest.json and added icons by @disha1202 in https://github.com/hotwax/inventory-count/pull/68
* Updated manifest.json by @disha1202 in https://github.com/hotwax/inventory-count/pull/69
* Implemented logic to handle product with no features(#238tkgm) by @disha1202 in https://github.com/hotwax/inventory-count/pull/72
* Improved markup of scanner modal(#238t4a0) by @Nihu-Sharma in https://github.com/hotwax/inventory-count/pull/73
* Deleted extra search page from inventory-count(#23eera9) by @Nihu-Sharma in https://github.com/hotwax/inventory-count/pull/74
* Added theme Color in index.html(#226cynn) by @Mayank909 in https://github.com/hotwax/inventory-count/pull/75
* Revert "Deleted extra search page from inventory-count(#23eera9)" by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/76
* Implemented: logic to select location on product detail page (#22qm8pq). by @meet-aniket in https://github.com/hotwax/inventory-count/pull/71
* Impelented: logic to select location on pdp page(#22qm8pq) by @disha1202 in https://github.com/hotwax/inventory-count/pull/70
* Added: support to get maximum locations for a product with the help of increasing viewSize. by @meet-aniket in https://github.com/hotwax/inventory-count/pull/79
* Improved: code to fix error while having spaces around fields on the Login page (#20jwqu1). by @meet-aniket in https://github.com/hotwax/inventory-count/pull/78
* Added firebase auto deployment configuration(#20d6xcu) by @disha1202 in https://github.com/hotwax/inventory-count/pull/60
* Improved: code to assign input field to instance variable for searchbar (#2cj8nc4). by @meet-aniket in https://github.com/hotwax/inventory-count/pull/84
* Fixed: Set keyboard type for stock input field(#2cqz21c) by @Mayank909 in https://github.com/hotwax/inventory-count/pull/85
* Fixed: Instance URL should be case insensitive(#2ft61zw) by @rathoreprashant in https://github.com/hotwax/inventory-count/pull/91
* Improved: code to hide option to set baseURL if value available in '.env' file (#29wgkkh). by @Mayank909 in https://github.com/hotwax/inventory-count/pull/83
* Improved label to "eCom Store" on Settings page (#23tw4yf) by @rathoreprashant in https://github.com/hotwax/inventory-count/pull/94
* Implemented: Code to check if user has permission to access the app(#2hr41aq) by @shashwatbangar in https://github.com/hotwax/inventory-count/pull/95
* User should be directly able to navigate to product detail page(#1yzcv99) by @disha1202 in https://github.com/hotwax/inventory-count/pull/96
* User should be directly able to navigate to product detail page (#1yzcv99) by @bashu22tiwari in https://github.com/hotwax/inventory-count/pull/46
* Users should be directly able to navigate to the product detail page (#1yzcv99). by @meet-aniket in https://github.com/hotwax/inventory-count/pull/81

## New Contributors
* @Nihu-Sharma made their first contribution in https://github.com/hotwax/inventory-count/pull/73
* @Mayank909 made their first contribution in https://github.com/hotwax/inventory-count/pull/75
* @rathoreprashant made their first contribution in https://github.com/hotwax/inventory-count/pull/91
* @shashwatbangar made their first contribution in https://github.com/hotwax/inventory-count/pull/95

**Full Changelog**: https://github.com/hotwax/inventory-count/compare/1.0.0...v1.0.1


# Release 1.0.0

## Initial app comes with following functionality:
* User should be able to login into the app
* On Search page, user is able to search any product with text search and scan.
* From product detail/count page user is able to log inventory count.
* From Upload page, user is able to upload logged inventory.
* From settings page, user is able to switch between stores and logout.

## What's Changed
* Update: readme file updated by @sheetalj2205 in https://github.com/hotwax/inventory-count/pull/7
* Added: the issue and pull request template by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/10
* Improved: code for the count page to redirect the user to search and also   updated the showToast function to add custom buttons(#ew3j63) by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/1
* Improved: code by removing the redundant usage of ion-footer and declared the footer in the app file(#ew8pb0) by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/2
* Improved: The code to use Image component (#1te0geh) by @NamanTech in https://github.com/hotwax/inventory-count/pull/19
* Improved: The code to display image properly on the count page (#1tkr… by @NamanTech in https://github.com/hotwax/inventory-count/pull/22
* Updated title for inventorycount(#1w9gm4n) by @Utkarshkaraiya in https://github.com/hotwax/inventory-count/pull/25
* Updated title for the app by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/28
* Updated: the favicon image for the app(#1wuthbh) by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/29
* Stop tracking .env file with source by @rahulbhooteshwar in https://github.com/hotwax/inventory-count/pull/8
* Added initial values by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/31
* updated: favicon by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/33
* Added instance URL support for inventory count  (#1wuu9yg) by @bashu22tiwari in https://github.com/hotwax/inventory-count/pull/30
* Improved: code to prepare loader on app mounted and assign it to null  on dismiss(#1x68xu9) by @Yashi002 in https://github.com/hotwax/inventory-count/pull/34
* Implemented code to display OMS information on settings page(#1ytrtk0) by @disha1202 in https://github.com/hotwax/inventory-count/pull/37
* Fixed the position of input label on login page (#1ym3jwv) by @azkyakhan in https://github.com/hotwax/inventory-count/pull/39
* removed console warnings and errors from application (#1ytpx0q). by @meet-aniket in https://github.com/hotwax/inventory-count/pull/38
* Added filter to not display virtual products (#1ytryjv) by @bashu22tiwari in https://github.com/hotwax/inventory-count/pull/42
* Solved issue of numFound on the search page ( #1ym23u6 ). by @meet-aniket in https://github.com/hotwax/inventory-count/pull/40
* Updated the markup(#1y2ract) by @disha1202 in https://github.com/hotwax/inventory-count/pull/44
* Improved store change configuration UI (#1ytrtqa) by @bashu22tiwari in https://github.com/hotwax/inventory-count/pull/41
* Removed .env.production and .env.staging (#1ytq0q0) by @bashu22tiwari in https://github.com/hotwax/inventory-count/pull/36
* Added support to search products by scanning barcode(#47gzm1) by @disha1202 in https://github.com/hotwax/inventory-count/pull/43
* Improved readme and added all .env files example to .gitignore by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/47
* Create CODE_OF_CONDUCT.md by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/48
* Create CONTRIBUTING.md by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/49
* Improved: app name and version of the app by @ymaheshwari1 in https://github.com/hotwax/inventory-count/pull/50
* Removed fab position adjustment and decreased value of bottom position of scan button (#2401fr1) by @azkyakhan in https://github.com/hotwax/inventory-count/pull/51
* Add image banner by @adityasharma7 in https://github.com/hotwax/inventory-count/pull/52
* Upgraded the version of vue barcode reader(#1zawzz8) by @disha1202 in https://github.com/hotwax/inventory-count/pull/53

## New Contributors
* @sheetalj2205 made their first contribution in https://github.com/hotwax/inventory-count/pull/7
* @ymaheshwari1 made their first contribution in https://github.com/hotwax/inventory-count/pull/10
* @NamanTech made their first contribution in https://github.com/hotwax/inventory-count/pull/19
* @Utkarshkaraiya made their first contribution in https://github.com/hotwax/inventory-count/pull/25
* @rahulbhooteshwar made their first contribution in https://github.com/hotwax/inventory-count/pull/8
* @adityasharma7 made their first contribution in https://github.com/hotwax/inventory-count/pull/31
* @Yashi002 made their first contribution in https://github.com/hotwax/inventory-count/pull/34
* @disha1202 made their first contribution in https://github.com/hotwax/inventory-count/pull/37
* @azkyakhan made their first contribution in https://github.com/hotwax/inventory-count/pull/39
* @meet-aniket made their first contribution in https://github.com/hotwax/inventory-count/pull/38

**Full Changelog**: https://github.com/hotwax/inventory-count/commits/1.0.0
