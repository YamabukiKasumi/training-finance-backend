// Unix时间戳（毫秒）
var timestamp = 1638662400; // 注意：JavaScript中的Date对象通常需要毫秒
 
// 转换为Date对象
var date = new Date(timestamp);
 
// 格式化为可读的日期格式
var readable_date = date.toLocaleString(); // 或者使用其他格式化方法，如date.toLocaleString()
 
console.log(readable_date);