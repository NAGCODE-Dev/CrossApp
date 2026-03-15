window.__CROSSAPP_CONFIG__ = {
  apiBaseUrl: 'https://your-backend.up.railway.app',
  telemetryEnabled: true,
  billing: {
    provider: 'kiwify_link',
    successUrl: 'https://your-frontend.vercel.app/coach/?billing=success',
    cancelUrl: 'https://your-frontend.vercel.app/coach/?billing=cancel',
    links: {
      athlete_plus: 'https://checkout.kiwify.com.br/example-athlete-plus',
      starter: 'https://checkout.kiwify.com.br/example-starter',
      pro: 'https://checkout.kiwify.com.br/example-pro',
      coach: 'https://checkout.kiwify.com.br/example-coach',
      performance: 'https://checkout.kiwify.com.br/example-performance',
    },
  },
};
