class APIFeatures {
  constructor(dataQuery, routeQuery) {
    // dataQuery === Tour
    // routeQuery === req.query

    this.dataQuery = dataQuery;
    this.routeQuery = routeQuery;
  }
  filter() {
    // 1) filtering
    const queryObj = { ...this.routeQuery };
    const excludedFields = ['sort', 'page', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 2) advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

    this.dataQuery.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.routeQuery.sort) {
      const sortBy = this.routeQuery.sort.split(',').join(' ');
      this.dataQuery = this.dataQuery.sort(sortBy);
    } else {
      this.dataQuery = this.dataQuery.sort('-createdAt');
    }
    return this;
  }
  limitFields() {
    if (this.routeQuery.fields) {
      const fields = this.routeQuery.fields.split(',').join(' ');
      this.dataQuery = this.dataQuery.select(fields);
      // this is the properties of each tour which we want to specify
    } else {
      this.dataQuery = this.dataQuery.select('-__v');
      // if no fields get them all
    }
    return this;
  }
  paginate() {
    const page = +this.routeQuery.page || 1;
    const limit = +this.routeQuery.limit || 100;
    const skip = (page - 1) * limit;

    this.dataQuery = this.dataQuery.skip(skip).limit(limit);
    // انا هنا بقوله يفوت عدد من العناصر وعدد العناصر اللي انا عايزها ف الصفحة تكون هي الليمت

    return this;
  }
}

module.exports = APIFeatures;
