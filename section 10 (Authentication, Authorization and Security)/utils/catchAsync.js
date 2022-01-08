module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err));
    // fn(req, res, next).catch(next); also could be typed like this because we pass the err to the inner function of the catch function automatically
  };
};

/*

دالة fn اللي جوا هي الدالة ال async اللي موجودة ف الكنترولرز واللي هنمررها هنا
المفروض ان الدالة دي هترجع برومس عشان كدا احنا نقدر نعمل كاتش ليها 
انا عايز ارجع رفرنس للدالة مش انادي عليها عشان كدا عملناها انها تنادي جوا دالة تانية بحيث ترجع ف الاخر نتيجة الكول جوا دالة علي انها رفرنس


 */
