export function ThemeScript() {
  const code = `
(function() {
  try {
    var t = localStorage.getItem('deanst.theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.dataset.theme = 'dark';
    }
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
