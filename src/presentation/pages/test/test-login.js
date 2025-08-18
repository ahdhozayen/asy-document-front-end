// Simple test script to verify login functionality
// Run this in the browser console after navigating to the login page

// Test function to verify login and user profile loading
async function testLoginFlow() {
  console.log('=== Starting Login Flow Test ===');
  
  // 1. Check if localStorage has tokens
  const hasTokens = localStorage.getItem('access') && localStorage.getItem('refresh');
  console.log(`Initial auth state: ${hasTokens ? 'Has tokens' : 'No tokens'}`);
  
  // 2. Get Angular services
  const authService = angular.element(document.body).injector().get('AuthService');
  const httpClient = angular.element(document.body).injector().get('HttpClientService');
  
  // 3. Check current authentication state
  console.log(`Is authenticated: ${authService.isAuthenticated}`);
  console.log(`Current user: ${JSON.stringify(authService.currentUser)}`);
  
  // 4. Test login with test credentials
  console.log('Attempting login...');
  try {
    const loginResult = await authService.login({
      username: 'testuser',
      password: 'password123'
    }).toPromise();
    
    console.log('Login successful!');
    console.log(`Access token: ${localStorage.getItem('access').substring(0, 15)}...`);
    console.log(`Refresh token: ${localStorage.getItem('refresh').substring(0, 15)}...`);
    console.log(`User: ${JSON.stringify(loginResult.user)}`);
  } catch (error) {
    console.error('Login failed:', error);
  }
  
  // 5. Check if user profile is loaded correctly
  console.log('Checking user profile...');
  try {
    const userProfile = await authService.getCurrentUser().toPromise();
    console.log('User profile loaded successfully:');
    console.log(`User ID: ${userProfile.id}`);
    console.log(`Name: ${userProfile.firstName} ${userProfile.lastName}`);
    console.log(`Role: ${userProfile.role}`);
  } catch (error) {
    console.error('Failed to load user profile:', error);
  }
  
  // 6. Test permission checks
  console.log('Testing permission checks...');
  const authorizationService = angular.element(document.body).injector().get('AuthorizationService');
  
  // Test view permission
  authorizationService.canViewDocumentOnDashboard().subscribe(
    canView => console.log(`Can view documents on dashboard: ${canView}`),
    error => console.error('Error checking view permission:', error)
  );
  
  // Test edit permission with a mock document
  const mockDocument = {
    id: 1,
    title: 'Test Document',
    status: 'pending'
  };
  
  authorizationService.canEditDocument(mockDocument).subscribe(
    canEdit => console.log(`Can edit document: ${canEdit}`),
    error => console.error('Error checking edit permission:', error)
  );
  
  console.log('=== Login Flow Test Complete ===');
}

// Execute the test
testLoginFlow().catch(console.error);
