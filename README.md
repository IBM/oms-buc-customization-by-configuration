## Overview
* By default, the Order search and Shipment search pages in Order Console include a comprehensive set of search fields. However, you can customize the pages to add extra search fields that are supported by the IBM Sterling Order Management API.
* This repository provides:
  * Sample code that you can use as a reference to customize the search pages
  * A script to upload the content to your tenant

### Setup
* Install `yarn` (For more information, see [Yarn](https://classic.yarnpkg.com/en/docs/install))
* `yarn install` to install dependencies
* Add or update environment variables with tenant information. For information about how to retrieve the client ID and secret, see [Assigning a tenant type](https://www.ibm.com/support/knowledgecenter/SSGTJF/developing/custom_tenanttype.html).
  * `BUC_CLIENT_ID`:
    * The Customization client id from the Order Console user interface
    * if not specified, this will be prompted for
    * e.g., on unix-type systems: `export BUC_CLIENT_ID=<value>`
  * `BUC_CLIENT_SECRET`:
    * The Customization auth key from the Order Console user interface
    * if not specified, this will be prompted for
    * e.g., on unix-type systems: `export BUC_CLIENT_SECRET=<value>`

### Asset deployment
* Use the `upload` script with parameter `all` to deploy all assets:
  * `search_fields.json` (for information about the attributes in the file, see [IBM Knowledge Center](https://www.ibm.com/support/knowledgecenter/SSGTJF/developing/buc_ootb_parent.html))
  * translation JSON files (For information about translation file naming convention, click  [here](#translation-file-naming))
* invoke using: `yarn upload all [ <app1> [ <app2> [ ... ] ] ]`
   * For example `yarn upload all buc-app-order`

### Uploading
* run `yarn upload` for usage instructions

### Translation file naming
* Naming convention for language translation files:
  * `de.json`: German
  * `en.json`: English
  * `es.json`: Spanish
  * `fr.json`: French
  * `it.json`: Italian
  * `ja.json`: Japanese
  * `ko.json`: Korean
  * `pl.json`: Polish
  * `pt_BR.json`: Portuguese
  * `ru.json`: Russian
  * `tr.json`: Turkish
  * `zh_CN.json`: Simplified chinese
  * `zh_TW.json`: Traditional chinese