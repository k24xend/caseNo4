import XCTest

final class VyhodUITests: XCTestCase {
    func testLaunchShowsAuthentication() {
        let app = XCUIApplication(); app.launchArguments = ["-ui-testing"]; app.launch()
        XCTAssertTrue(app.buttons["auth-submit"].waitForExistence(timeout: 5))
    }
}
