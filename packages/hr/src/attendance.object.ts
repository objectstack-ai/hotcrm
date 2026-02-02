
const Attendance = {
  name: 'attendance',
  label: '考勤',
  labelPlural: '考勤记录',
  icon: 'clock',
  description: '员工考勤和工时跟踪',
  enable: {
    searchable: true,
    trackHistory: false,
    activities: false,
    feeds: false,
    files: false
  },
  fields: {
    employee_id: {
      type: 'lookup',
      label: '员工',
      reference: 'employee',
      required: true
    },
    attendance_date: {
      type: 'date',
      label: '考勤日期',
      required: true
    },
    check_in_time: {
      type: 'datetime',
      label: '签到时间'
    },
    check_out_time: {
      type: 'datetime',
      label: '签退时间'
    },
    work_hours: {
      type: 'number',
      label: '工作时长（小时）',
      precision: 2,
      readonly: true,
      description: '自动计算的工作时长'
    },
    status: {
      type: 'select',
      label: '考勤状态',
      defaultValue: 'Present',
      options: [
        { label: '正常', value: 'Present' },
        { label: '迟到', value: 'Late' },
        { label: '早退', value: 'Early Leave' },
        { label: '缺勤', value: 'Absent' },
        { label: '请假', value: 'On Leave' },
        { label: '出差', value: 'Business Trip' },
        { label: '远程办公', value: 'Remote Work' },
        { label: '加班', value: 'Overtime' }
      ]
    },
    late_minutes: {
      type: 'number',
      label: '迟到分钟数',
      precision: 0
    },
    early_leave_minutes: {
      type: 'number',
      label: '早退分钟数',
      precision: 0
    },
    overtime_hours: {
      type: 'number',
      label: '加班时长（小时）',
      precision: 2
    },
    location: {
      type: 'select',
      label: '工作地点',
      options: [
        { label: '办公室', value: 'Office' },
        { label: '远程', value: 'Remote' },
        { label: '客户现场', value: 'Client Site' },
        { label: '出差', value: 'Business Trip' }
      ]
    },
    check_in_location: {
      type: 'location',
      label: '签到位置',
      description: 'GPS位置（如适用）'
    },
    check_out_location: {
      type: 'location',
      label: '签退位置',
      description: 'GPS位置（如适用）'
    },
    is_approved: {
      type: 'checkbox',
      label: '是否已审核',
      defaultValue: false
    },
    approver_id: {
      type: 'lookup',
      label: '审核人',
      reference: 'employee'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 3,
      description: '异常情况说明等'
    }
  },
  listViews: [
    {
      name: 'All',
      label: '所有考勤',
      filters: [],
      columns: ['employee_id', 'attendance_date', 'check_in_time', 'check_out_time', 'work_hours', 'status']
    },
    {
      name: 'Today',
      label: '今日考勤',
      filters: [['attendance_date', '=', '$today']],
      columns: ['employee_id', 'check_in_time', 'check_out_time', 'work_hours', 'status', 'location']
    },
    {
      name: 'MyAttendance',
      label: '我的考勤',
      filters: [['employee_id', '=', '$currentUser']],
      columns: ['attendance_date', 'check_in_time', 'check_out_time', 'work_hours', 'status', 'overtime_hours'],
      sort: [['attendance_date', 'desc']]
    },
    {
      name: 'Late',
      label: '迟到记录',
      filters: [['status', '=', 'Late']],
      columns: ['employee_id', 'attendance_date', 'check_in_time', 'late_minutes', 'notes']
    },
    {
      name: 'Absent',
      label: '缺勤记录',
      filters: [['status', '=', 'Absent']],
      columns: ['employee_id', 'attendance_date', 'notes']
    },
    {
      name: 'Overtime',
      label: '加班记录',
      filters: [
        ['status', '=', 'Overtime'],
        ['overtime_hours', '>', 0]
      ],
      columns: ['employee_id', 'attendance_date', 'work_hours', 'overtime_hours', 'is_approved'],
      sort: [['attendance_date', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['employee_id', 'attendance_date', 'status']
      },
      {
        label: '时间记录',
        columns: 2,
        fields: ['check_in_time', 'check_out_time', 'work_hours']
      },
      {
        label: '异常情况',
        columns: 2,
        fields: ['late_minutes', 'early_leave_minutes', 'overtime_hours']
      },
      {
        label: '地点信息',
        columns: 2,
        fields: ['location', 'check_in_location', 'check_out_location']
      },
      {
        label: '审核',
        columns: 2,
        fields: ['is_approved', 'approver_id']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Attendance;
