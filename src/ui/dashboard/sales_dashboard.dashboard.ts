/**
 * Sales Dashboard UI Configuration
 * 
 * Built with amis framework and Tailwind CSS
 * Design aesthetic: Apple macOS / Linear inspired
 * 
 * Features:
 * - KPI Cards (Revenue, Leads, Win Rate)
 * - Pipeline Funnel Chart
 * - Recent Activities Timeline
 */

export const salesDashboard = {
  "type": "page",
  "title": "销售主管仪表盘",
  "className": "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100",
  "body": [
    {
      "type": "container",
      "className": "max-w-7xl mx-auto px-6 py-8",
      "body": [
        // Header Section
        {
          "type": "container",
          "className": "mb-8",
          "body": [
            {
              "type": "html",
              "html": "<h1 class='text-4xl font-bold text-gray-900 mb-2'>销售仪表盘</h1>"
            },
            {
              "type": "html",
              "html": "<p class='text-lg text-gray-600'>实时洞察您的销售业绩</p>"
            }
          ]
        },

        // KPI Cards Section
        {
          "type": "grid",
          "className": "gap-6 mb-8",
          "columns": [
            {
              "md": 4,
              "body": [
                {
                  "type": "service",
                  "api": "/api/kpi/revenue",
                  "body": [
                    {
                      "type": "card",
                      "className": "bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 backdrop-blur-sm",
                      "body": [
                        {
                          "type": "container",
                          "className": "flex items-start justify-between",
                          "body": [
                            {
                              "type": "container",
                              "body": [
                                {
                                  "type": "html",
                                  "html": "<div class='text-sm font-medium text-gray-600 mb-2'>本季度营收</div>"
                                },
                                {
                                  "type": "tpl",
                                  "tpl": "<div class='text-3xl font-bold text-gray-900'>${revenue | number:0,0}</div>",
                                  "className": "mb-2"
                                },
                                {
                                  "type": "tpl",
                                  "tpl": "<div class='text-sm ${growth >= 0 ? \"text-green-600\" : \"text-red-600\"} font-medium'>${growth >= 0 ? '↑' : '↓'} ${growth}% vs 上季度</div>"
                                }
                              ]
                            },
                            {
                              "type": "html",
                              "html": "<div class='w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center'><svg class='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'></path></svg></div>"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "md": 4,
              "body": [
                {
                  "type": "service",
                  "api": "/api/kpi/leads",
                  "body": [
                    {
                      "type": "card",
                      "className": "bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 backdrop-blur-sm",
                      "body": [
                        {
                          "type": "container",
                          "className": "flex items-start justify-between",
                          "body": [
                            {
                              "type": "container",
                              "body": [
                                {
                                  "type": "html",
                                  "html": "<div class='text-sm font-medium text-gray-600 mb-2'>新增线索</div>"
                                },
                                {
                                  "type": "tpl",
                                  "tpl": "<div class='text-3xl font-bold text-gray-900'>${count}</div>",
                                  "className": "mb-2"
                                },
                                {
                                  "type": "tpl",
                                  "tpl": "<div class='text-sm text-gray-600'>${qualified} 已确认资格</div>"
                                }
                              ]
                            },
                            {
                              "type": "html",
                              "html": "<div class='w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center'><svg class='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'></path></svg></div>"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "md": 4,
              "body": [
                {
                  "type": "service",
                  "api": "/api/kpi/winrate",
                  "body": [
                    {
                      "type": "card",
                      "className": "bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 backdrop-blur-sm",
                      "body": [
                        {
                          "type": "container",
                          "className": "flex items-start justify-between",
                          "body": [
                            {
                              "type": "container",
                              "body": [
                                {
                                  "type": "html",
                                  "html": "<div class='text-sm font-medium text-gray-600 mb-2'>赢单率</div>"
                                },
                                {
                                  "type": "tpl",
                                  "tpl": "<div class='text-3xl font-bold text-gray-900'>${rate}%</div>",
                                  "className": "mb-2"
                                },
                                {
                                  "type": "tpl",
                                  "tpl": "<div class='text-sm text-gray-600'>${won}/${total} 商机</div>"
                                }
                              ]
                            },
                            {
                              "type": "html",
                              "html": "<div class='w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center'><svg class='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'></path></svg></div>"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },

        // Pipeline Chart Section
        {
          "type": "card",
          "className": "bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8 backdrop-blur-sm",
          "body": [
            {
              "type": "html",
              "html": "<h2 class='text-2xl font-bold text-gray-900 mb-6'>销售漏斗</h2>"
            },
            {
              "type": "service",
              "api": "/api/pipeline/stages",
              "body": [
                {
                  "type": "chart",
                  "api": "/api/pipeline/stages",
                  "className": "h-96",
                  "config": {
                    "type": "funnel",
                    "data": "${stages}",
                    "xField": "stage",
                    "yField": "amount",
                    "legend": false,
                    "label": {
                      "formatter": (datum: any) => `${datum.stage}: ¥${datum.amount.toLocaleString()}`
                    },
                    "conversionTag": {
                      "formatter": (datum: any) => `转化率 ${(datum.$$percentage$$ * 100).toFixed(2)}%`
                    },
                    "color": ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
                    "funnelStyle": {
                      "lineWidth": 2,
                      "stroke": "#ffffff"
                    }
                  }
                }
              ]
            }
          ]
        },

        // Recent Activities Section
        {
          "type": "card",
          "className": "bg-white rounded-2xl p-8 shadow-sm border border-gray-200 backdrop-blur-sm",
          "body": [
            {
              "type": "html",
              "html": "<h2 class='text-2xl font-bold text-gray-900 mb-6'>最近动态</h2>"
            },
            {
              "type": "service",
              "api": "/api/activities/recent",
              "body": [
                {
                  "type": "list",
                  "source": "${activities}",
                  "className": "space-y-4",
                  "listItem": {
                    "body": [
                      {
                        "type": "container",
                        "className": "flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-150",
                        "body": [
                          {
                            "type": "avatar",
                            "className": "w-10 h-10 rounded-full ring-2 ring-white shadow-sm",
                            "src": "${userAvatar}",
                            "text": "${userName}"
                          },
                          {
                            "type": "container",
                            "className": "flex-1 min-w-0",
                            "body": [
                              {
                                "type": "container",
                                "className": "flex items-center gap-2 mb-1",
                                "body": [
                                  {
                                    "type": "tpl",
                                    "tpl": "<span class='font-semibold text-gray-900'>${userName}</span>"
                                  },
                                  {
                                    "type": "tpl",
                                    "tpl": "<span class='text-gray-600'>${actionText}</span>"
                                  }
                                ]
                              },
                              {
                                "type": "tpl",
                                "tpl": "<div class='text-sm text-gray-900 mb-1'>${subject}</div>"
                              },
                              {
                                "type": "tpl",
                                "tpl": "<div class='text-xs text-gray-500'>${relativeTime}</div>"
                              }
                            ]
                          },
                          {
                            "type": "html",
                            "html": "<span class='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}'>${status}</span>"
                          }
                        ]
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export default salesDashboard;
