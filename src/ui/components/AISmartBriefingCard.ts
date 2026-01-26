/**
 * AI Smart Briefing UI Component
 * 
 * This amis configuration renders an AI-powered customer briefing card
 * on the Account detail page.
 * 
 * Design: Apple-inspired with AI visual indicators
 */

export const aiSmartBriefingCard = {
  "type": "card",
  "className": "bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-purple-200 backdrop-blur-sm mb-6",
  "body": [
    // Header with AI Icon
    {
      "type": "container",
      "className": "flex items-center gap-3 mb-4",
      "body": [
        {
          "type": "html",
          "html": `
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
          `
        },
        {
          "type": "html",
          "html": "<h3 class='text-xl font-bold text-gray-900'>AI 智能简报</h3>"
        },
        {
          "type": "html",
          "html": "<span class='ml-auto px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full'>由 AI 生成</span>"
        }
      ]
    },

    // Loading State
    {
      "type": "spinner",
      "show": "${!briefing}",
      "className": "my-8"
    },

    // Service to fetch AI briefing
    {
      "type": "service",
      "api": {
        "method": "post",
        "url": "/api/ai/smart-briefing",
        "data": {
          "accountId": "${id}"
        }
      },
      "body": [
        {
          "type": "container",
          "visibleOn": "${briefing}",
          "body": [
            // Summary Section
            {
              "type": "container",
              "className": "mb-6",
              "body": [
                {
                  "type": "html",
                  "html": "<h4 class='text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide'>摘要</h4>"
                },
                {
                  "type": "tpl",
                  "tpl": "<p class='text-gray-800 leading-relaxed'>${summary}</p>",
                  "className": "bg-white rounded-xl p-4 border border-gray-200"
                }
              ]
            },

            // Sentiment & Engagement Bar
            {
              "type": "container",
              "className": "flex items-center gap-4 mb-6",
              "body": [
                {
                  "type": "container",
                  "className": "flex-1",
                  "body": [
                    {
                      "type": "html",
                      "html": "<div class='text-xs font-medium text-gray-600 mb-2'>客户情绪</div>"
                    },
                    {
                      "type": "tpl",
                      "tpl": `
                        <div class="flex items-center gap-2">
                          <span class="\${sentiment === 'positive' ? 'text-green-600' : sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'} text-sm font-semibold">
                            \${sentiment === 'positive' ? '😊 积极' : sentiment === 'negative' ? '😟 消极' : '😐 中性'}
                          </span>
                        </div>
                      `
                    }
                  ]
                },
                {
                  "type": "container",
                  "className": "flex-1",
                  "body": [
                    {
                      "type": "html",
                      "html": "<div class='text-xs font-medium text-gray-600 mb-2'>互动评分</div>"
                    },
                    {
                      "type": "progress",
                      "value": "${engagementScore}",
                      "className": "h-2 rounded-full",
                      "progressClassName": "bg-gradient-to-r from-purple-500 to-blue-500",
                      "map": {
                        "*": "bg-gray-200"
                      }
                    },
                    {
                      "type": "tpl",
                      "tpl": "<div class='text-xs text-gray-600 mt-1'>${engagementScore}/100</div>"
                    }
                  ]
                }
              ]
            },

            // Next Steps Section
            {
              "type": "container",
              "className": "mb-6",
              "body": [
                {
                  "type": "html",
                  "html": "<h4 class='text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide'>下一步行动</h4>"
                },
                {
                  "type": "list",
                  "source": "${nextSteps}",
                  "className": "space-y-2",
                  "listItem": {
                    "body": [
                      {
                        "type": "container",
                        "className": "flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-200 hover:border-purple-300 transition-colors",
                        "body": [
                          {
                            "type": "html",
                            "html": "<div class='w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5'><svg class='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'><path fill-rule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clip-rule='evenodd'></path></svg></div>"
                          },
                          {
                            "type": "tpl",
                            "tpl": "<span class='text-sm text-gray-800'>${item}</span>",
                            "className": "flex-1"
                          }
                        ]
                      }
                    ]
                  }
                }
              ]
            },

            // Talking Points Section
            {
              "type": "container",
              "className": "mb-4",
              "body": [
                {
                  "type": "html",
                  "html": "<h4 class='text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide'>销售话术建议</h4>"
                },
                {
                  "type": "list",
                  "source": "${talkingPoints}",
                  "className": "space-y-2",
                  "listItem": {
                    "body": [
                      {
                        "type": "container",
                        "className": "flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-200",
                        "body": [
                          {
                            "type": "html",
                            "html": "<div class='w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5'><svg class='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'><path fill-rule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clip-rule='evenodd'></path></svg></div>"
                          },
                          {
                            "type": "tpl",
                            "tpl": "<span class='text-sm text-gray-800'>${item}</span>",
                            "className": "flex-1"
                          }
                        ]
                      }
                    ]
                  }
                }
              ]
            },

            // Metadata Footer
            {
              "type": "container",
              "className": "pt-4 border-t border-gray-200",
              "body": [
                {
                  "type": "tpl",
                  "tpl": "<div class='flex items-center gap-4 text-xs text-gray-500'><span>📊 分析了 ${metadata.activitiesAnalyzed} 条活动</span><span>📧 ${metadata.emailsAnalyzed} 封邮件</span><span>⏰ ${metadata.generatedAt | date:'YYYY-MM-DD HH:mm'}</span></div>"
                }
              ]
            },

            // Refresh Button
            {
              "type": "container",
              "className": "mt-4",
              "body": [
                {
                  "type": "button",
                  "label": "🔄 重新生成",
                  "level": "link",
                  "className": "text-sm text-purple-600 hover:text-purple-700 font-medium",
                  "actionType": "reload",
                  "target": "service"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export default aiSmartBriefingCard;
