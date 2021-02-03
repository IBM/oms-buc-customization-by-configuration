const request = require('request');
const readline = require('readline');
const fs = require('fs');
const archiver = require('archiver');

const BUC_TABLE_CONFIG = 'buc-table-config';
const GET_PAGE_TEMPLATES = 'getPage-templates';
const BUC_FIELD_DETAILS = 'buc-field-details';
const BUC_TENANT_CONFIG = 'buc-tenant-config';
const VALID_CTX = {
  search_fields: 'search_fields',
  translation: 'translation',
  all: 'all',
  [ BUC_TABLE_CONFIG ]: BUC_TABLE_CONFIG,
  [ GET_PAGE_TEMPLATES ]: GET_PAGE_TEMPLATES,
  [ BUC_FIELD_DETAILS ]: BUC_FIELD_DETAILS,
  [ BUC_TENANT_CONFIG ]:  BUC_TENANT_CONFIG
};
const USAGE = '\n' +
  'usage: yarn upload all [<app-list>]\n' +
  // '  asset-type: search_fields | buc-table-config | getPage-templates | translation | all\n' +
  '  app-list: <app1> [ <app2> [ ... ] ], e.g., buc-app-order; uploads for all apps if omitted';
const ROOT = './customization';
const DIST = './dist';
const ASSET_ZIP = `${DIST}/asset.zip`;
const EMPTY_DIR_MAP = {};
const NL = '\r\n';
const UTF8 = 'utf8';
const BIN = 'binary';

function generateId(len = 7) {
  const ul = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  const a = [];
  while (a.length < len) {
    a.push(ul[Math.floor(Math.random() * 62)]);
  }
  return a.join('');
};

function zipEmptyDirs(leadingPath, z) {
  const leading = leadingPath.split('/');
  leading
  .map((d, i) => `${i === 0 ? '' : [ ... leading.slice(0, i), '' ].join('/')}${d}/`)
  .filter(d => !EMPTY_DIR_MAP[d])
  .forEach(name => EMPTY_DIR_MAP[name] = z.append('', { name, mode: 755 }));
}

function collectFile(f, z) {
  if (fs.existsSync(`${ROOT}/${f}`)) {
    console.log('Zipping file "%s"', f);
    zipEmptyDirs(f.replace(/^(.+)\/.+/, '$1'), z)
    z.glob(f, { cwd: ROOT });
  }
}

function collectFolder(d, z, re = /.*/) {
  if (fs.existsSync(`${ROOT}/${d}`)) {
    console.log('Zipping folder "%s"', d);
    zipEmptyDirs(d, z);
    z.directory(`${ROOT}/${d}`, d, (e) => e.name.match(re) ? e : false);
  }
}

function validateAppList(appList) {
  const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter(fd => fd.isDirectory()).map(fd => fd.name);
  const asMap = dirs.reduce((m, v) => { m[v] = v; return m; }, {});
  const list = appList.filter(a => {
    if (!asMap[a]) {
      console.log('"%s" is not a valid app', a);
    }
    return !!asMap[a];
  });
  return { all: dirs, requested: list };
}

function upload(zip, tenantInfo) {
  const name = zip.replace(/^.+\//, '');
  const content = fs.readFileSync(zip, { encoding: BIN });
  const b = generateId();
  const body = Buffer.concat([
    Buffer.from(`--${b}${NL}`, UTF8),
    Buffer.from(`Content-Disposition: form-data; name="The customization configuration ZIP file"; filename="${name}"${NL}`, UTF8),
    Buffer.from(`Content-Type: application/zip${NL}${NL}`, UTF8),
    Buffer.from(content, BIN),
    Buffer.from(`${NL}--${b}--${NL}`, UTF8)
  ]);
  const domainSuffix = (!tenantInfo.type || tenantInfo.type === 'prod') ? '' : `-${tenantInfo.type}`;
  const url = `https://app${domainSuffix}.omsbusinessusercontrols.ibm.com/cw/spi/resources/customization/config/upload`;
  const options = {
    method: 'post',
    url,
    proxy: tenantInfo.proxy,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${b}`,
      'x-ibm-client-id': tenantInfo.clientId,
      'x-ibm-client-secret': tenantInfo.clientSecret
    },
    body
  };

  request(options, function(e, r, b) {
    if (e) {
      console.error(e)
    } else if (r) {
      if (r.statusCode >= 200 && r.statusCode < 300) {
        console.log('No errors encountered; status: %o', r.statusCode)
      }
      if (b) {
        console.log(b);
      }
      console.log();
    }
  });
}

function collectSearchFields(app, z) {
  collectFile(`${app}/${VALID_CTX.search_fields}.json`, z);
}

function collectTableConfig(app, z) {
  collectFile(`${app}/${VALID_CTX[BUC_TABLE_CONFIG]}.json`, z);
}

function collectTenantConfig(app, z) {
  collectFile(`${app}/${VALID_CTX[BUC_TENANT_CONFIG]}.json`, z);
}

function collectPageTemplates(app, z) {
  collectFile(`${app}/${VALID_CTX[GET_PAGE_TEMPLATES]}.json`, z);
}

function collectTranslations(app, z) {
  collectFolder(`${app}/assets/${app}/i18n`, z, /\.json$/);
}

function collectSummarySections(app, z) {
  collectFile(`${app}/${VALID_CTX[BUC_FIELD_DETAILS]}.json`, z);
}

function zip(ctx, appList) {
  return new Promise(resolve => {
    fs.existsSync(DIST) || fs.mkdirSync(DIST);

    const f = fs.createWriteStream(ASSET_ZIP);
    f.on('close', () => resolve());

    const z = archiver('zip', { zlib: { level: 9 } });
    z.pipe(f);

    appList.forEach(app => {
      if (ctx === VALID_CTX.all) {
        collectSearchFields(app, z);
        collectTableConfig(app, z);
        collectPageTemplates(app, z);
        collectTranslations(app, z);
        collectSummarySections(app, z);
        collectTenantConfig(app, z);
      } else if (ctx === VALID_CTX.search_fields) {
        collectSearchFields(app, z);
      } else if (ctx === VALID_CTX[BUC_TABLE_CONFIG]) {
        collectTableConfig(app, z);
      } else if (ctx === VALID_CTX[GET_PAGE_TEMPLATES]) {
        collectPageTemplates(app, z);
      } else if (ctx === VALID_CTX[BUC_FIELD_DETAILS]) {
        collectSummarySections(app, z);
      } else if (ctx === VALID_CTX[BUC_TENANT_CONFIG]) {
        collectTenantConfig(app, z);
      } else {
        collectTranslations(app, z);
      }
    });

    console.log('Writing zip-file: "%s"', ASSET_ZIP);
    console.log();

    z.finalize();
  });
}

async function readTenantInfo() {
  const tenantInfo = {};
  const ENV = process.env;
  const getValue = (rl, text, check) => new Promise(doneReading => {
    rl.question(`Enter ${text} for the tenant: `, value => {
      console.log();
      rl._writeToOutput = (o) => rl.output.write(o);
      doneReading(value);
    });
    rl._writeToOutput = (o) => rl.output.write('*');
  });

  console.log('Reading tenant-info from environment');

  tenantInfo.proxy = ENV.BUC_PROXY;
  tenantInfo.type = ENV.BUC_TENANT_TYPE;
  tenantInfo.clientId = ENV.BUC_CLIENT_ID;
  tenantInfo.clientSecret = ENV.BUC_CLIENT_SECRET;

  const inp = readline.createInterface({ input: process.stdin, output: process.stdout });
  tenantInfo.clientId = tenantInfo.clientId || await getValue(inp, 'client-id', tenantInfo.clientId);
  tenantInfo.clientSecret = tenantInfo.clientSecret || await getValue(inp, 'client-secret', tenantInfo.clientSecret);
  inp.close();
  console.log();

  return tenantInfo;
}

async function main(argv) {
  // validate args
  if (argv.length === 0) {
    console.log(USAGE);
  } else {
    const ctx = argv.shift();

    // validate input
    if (!VALID_CTX[ctx]) {
      console.log('"%s" is not valid input', ctx);
      console.log(USAGE);
    } else {
      // validate app-list
      const o = validateAppList(argv);
      if (o.requested.length !== argv.length) {
        console.log(USAGE);
      } else {
        // zip assets
        await zip(ctx, o.requested.length === 0 ? o.all : o.requested);

        // get credentials
        const tenantInfo = await readTenantInfo();

        // upload
        upload(ASSET_ZIP, tenantInfo);
      }
    }
  }
}

main(process.argv.slice(2));
