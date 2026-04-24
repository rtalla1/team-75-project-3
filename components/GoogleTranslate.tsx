import {useEffect} from "react";

const GoogleTranslate: React.FC = () => {
  useEffect(() => {
    const clearTranslateCookies = () => {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
    };

    clearTranslateCookies();

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    // 2. Check if the script is already in the document to prevent duplicates
    const existingScript = document.getElementById('google-translate-script');
    
    if (!existingScript) {
      const addScript = document.createElement('script');
      addScript.setAttribute('id', 'google-translate-script');
      addScript.setAttribute(
        'src',
        '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      );
      document.body.appendChild(addScript);
    }
  }, []);
  return (
    <div style={{ padding: '10px' }}>
      {/* This ID must match the string used in the TranslateElement constructor above */}
      <div id="google_translate_element"></div>
    </div>
  );
};

export default GoogleTranslate