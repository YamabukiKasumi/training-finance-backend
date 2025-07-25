import datetime
 
# Unix时间戳
timestamp = 1751587200000
 
# 转换为datetime对象
dt_object = datetime.datetime.fromtimestamp(timestamp)
 
# 格式化为可读的日期格式
readable_date = dt_object.strftime('%Y-%m-%d %H:%M:%S')
 
print(readable_date)