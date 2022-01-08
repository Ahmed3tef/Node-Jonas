
class APIFeatures {
  // query = req.query
  // data = Tour.find()

  constructor(data, query) {
    this.data = data;
    this.query = query;
  }

  filter() {
    // a- filtering
    const queryObj = { ...this.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // b- advanced filtering

    let queryStr = JSON.stringify(queryObj);
    queryStr = JSON.parse(
      queryStr.replace(/\b(gt|gte|lte|lt)\b/g, match => `$${match}`)
    );
    this.data = this.data.find(queryStr);

    return this;
  }

  sort() {
    if (this.query.sort) {
      const sortBy = this.query.sort.split(',').join(' ');
      this.data = this.data.sort(sortBy);
    } else {
      this.data = this.data.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.query.fields) {
      const fields = this.query.fields.split(',').join(' ');
      this.data = this.data.select(fields);
    } else {
      this.data = this.data.sort('-__v');
    }
    return this;
  }

  paginate() {
    const page = +this.query.page || 1;
    const limit = +this.query.limit || 10;
    const skip = (page - 1) * limit;

    this.data = this.data.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;