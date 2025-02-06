const prepareProductQuery = (params: any) => {
  const viewSize = params.viewSize ? params.viewSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = params.viewIndex ? params.viewIndex : 0;

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "q.op": "AND",
        "start": viewIndex * viewSize
      },
      "query": "(*:*)",
      "filter": [`docType: ${params.docType ? params.docType : 'PRODUCT'}`]
    }
  } as any

  if (params.queryString) {
    payload.json.query = `*${params.queryString}* OR "${params.queryString}"^100`
    payload.json.params['qf'] = params.queryFields ? params.queryFields : "sku^100 upc^100 productName^50 internalName^40 productId groupId groupName"
    payload.json.params['defType'] = "edismax"
  }

  // checking that if the params has filters, and then adding the filter values in the payload filter
  // for each key present in the params filters
  if (params.filters) {
    Object.keys(params.filters).map((key: any) => {
      const filterValue = params.filters[key].value;

      if (Array.isArray(filterValue)) {
        const filterOperator = params.filters[key].op ? params.filters[key].op : 'OR';
        payload.json.filter += ` AND ${key}: (${filterValue.join(' ' + filterOperator + ' ')})`
      } else {
        payload.json.filter += ` AND ${key}: ${filterValue}`
      }
    })
  }

  if (params.facet) {
    payload.json['facet'] = params.facet
  }

  return payload
}

export { prepareProductQuery }
