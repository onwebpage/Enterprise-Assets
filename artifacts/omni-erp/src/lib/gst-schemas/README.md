# GSTN request schemas used for local payload validation

These JSON schemas were downloaded from the GSTN Developer Portal on 2026-11-18 and are validated with Ajv before a file can be downloaded:

- GSTR-1 `GSTR1 - Save GSTR1 data`, v5.0 (FINAL): https://developer.gst.gov.in/pages/apiportal/data/Returns/GSTR1%20-%20Save%20GSTR1%20data/v5.0/GSTR1%20-%20Save%20GSTR1%20data%20request_schema.json
- GSTR-3B `GSTR3B - Save GSTR3B data`, v7.1 (the portal currently labels this API version Draft): https://developer.gst.gov.in/pages/apiportal/data/Returns/GSTR3B%20-%20Save%20GSTR3B%20data/v7.1/GSTR3B%20-%20Save%20GSTR3B%20data%20request_schema.json

The GSTR-1 file identifies offline utility format GST3.2.4, listed on the official GST downloads page as of this date. Passing these request-schema checks is local structural validation only. It does not test GSTN business rules or mean that GSTN accepted a return.
